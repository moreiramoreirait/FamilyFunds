package com.familyfinance.service;

import com.familyfinance.dto.request.CreditCardRequest;
import com.familyfinance.dto.response.CreditCardResponse;
import com.familyfinance.dto.response.CreditCardInvoiceResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CreditCardService {

    private final CreditCardRepository creditCardRepository;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final FamilyGroupService familyGroupService;
    private final AccountRepository accountRepository;

    public List<CreditCardResponse> findAll(UUID groupId, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        return creditCardRepository.findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(groupId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public CreditCardResponse findById(UUID groupId, UUID cardId, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        CreditCard card = creditCardRepository.findById(cardId)
                .filter(c -> c.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));
        return toResponse(card);
    }

    public CreditCardResponse create(UUID groupId, CreditCardRequest req, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        FamilyGroup group = new FamilyGroup();
        group.setId(groupId);

        CreditCard card = CreditCard.builder()
                .familyGroup(group)
                .name(req.name())
                .brand(req.brand())
                .lastFourDigits(req.lastFourDigits())
                .creditLimit(req.creditLimit())
                .availableLimit(req.creditLimit())
                .closingDay(req.closingDay())
                .dueDay(req.dueDay())
                .color(req.color())
                .icon(req.icon())
                .isActive(true)
                .createdBy(currentUser)
                .build();

        return toResponse(creditCardRepository.save(card));
    }

    public CreditCardResponse update(UUID groupId, UUID cardId, CreditCardRequest req, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        CreditCard card = creditCardRepository.findById(cardId)
                .filter(c -> c.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));

        card.setName(req.name());
        card.setBrand(req.brand());
        card.setLastFourDigits(req.lastFourDigits());
        card.setCreditLimit(req.creditLimit());
        card.setClosingDay(req.closingDay());
        card.setDueDay(req.dueDay());
        card.setColor(req.color());
        card.setIcon(req.icon());

        return toResponse(creditCardRepository.save(card));
    }

    public void delete(UUID groupId, UUID cardId, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        CreditCard card = creditCardRepository.findById(cardId)
                .filter(c -> c.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));
        card.setIsActive(false);
        creditCardRepository.save(card);
    }

    public List<CreditCardInvoiceResponse> getInvoices(UUID groupId, UUID cardId, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        CreditCard card = creditCardRepository.findById(cardId)
                .filter(c -> c.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));
        return invoiceRepository.findByCreditCardIdOrderByReferenceYearDescReferenceMonthDesc(cardId)
                .stream().map(this::toInvoiceResponse).collect(Collectors.toList());
    }

    public CreditCardInvoiceResponse payInvoice(UUID groupId, UUID invoiceId, UUID paymentAccountId,
                                                 LocalDate paymentDate, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        CreditCardInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada"));

        Account payAccount = accountRepository.findById(paymentAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(paymentDate != null
                ? paymentDate.atStartOfDay()
                : java.time.LocalDateTime.now());
        invoice.setPaymentAccount(payAccount);

        // Debit payment account
        payAccount.setCurrentBalance(payAccount.getCurrentBalance().subtract(invoice.getTotalAmount()));
        accountRepository.save(payAccount);

        return toInvoiceResponse(invoiceRepository.save(invoice));
    }

    // Generate current month's invoice for a card (called when purchase is added)
    public CreditCardInvoice getOrCreateCurrentInvoice(CreditCard card) {
        LocalDate today = LocalDate.now();
        int closingDay = card.getClosingDay();

        // Determine reference month/year
        int referenceMonth;
        int referenceYear;
        if (today.getDayOfMonth() <= closingDay) {
            referenceMonth = today.getMonthValue();
            referenceYear = today.getYear();
        } else {
            LocalDate nextMonth = today.plusMonths(1);
            referenceMonth = nextMonth.getMonthValue();
            referenceYear = nextMonth.getYear();
        }

        return invoiceRepository.findByCreditCardIdAndReferenceMonthAndReferenceYear(
                card.getId(), referenceMonth, referenceYear
        ).orElseGet(() -> {
            LocalDate closingDate = LocalDate.of(referenceYear, referenceMonth, closingDay);
            LocalDate dueDate = closingDate.plusDays(card.getDueDay());

            CreditCardInvoice invoice = CreditCardInvoice.builder()
                    .familyGroup(card.getFamilyGroup())
                    .creditCard(card)
                    .referenceMonth(referenceMonth)
                    .referenceYear(referenceYear)
                    .closingDate(closingDate)
                    .dueDate(dueDate)
                    .totalAmount(BigDecimal.ZERO)
                    .status(InvoiceStatus.OPEN)
                    .build();
            return invoiceRepository.save(invoice);
        });
    }

    private CreditCardResponse toResponse(CreditCard card) {
        return new CreditCardResponse(
                card.getId(),
                card.getName(),
                card.getBrand(),
                card.getLastFourDigits(),
                card.getCreditLimit(),
                card.getAvailableLimit(),
                card.getClosingDay(),
                card.getDueDay(),
                card.getColor(),
                card.getIcon(),
                card.getIsActive()
        );
    }

    private CreditCardInvoiceResponse toInvoiceResponse(CreditCardInvoice invoice) {
        return new CreditCardInvoiceResponse(
                invoice.getId(),
                invoice.getCreditCard().getId(),
                invoice.getCreditCard().getName(),
                invoice.getReferenceMonth(),
                invoice.getReferenceYear(),
                invoice.getClosingDate(),
                invoice.getDueDate(),
                invoice.getTotalAmount(),
                invoice.getStatus().name(),
                invoice.getPaidAt() != null ? invoice.getPaidAt().toLocalDate() : null,
                invoice.getPaymentAccount() != null ? invoice.getPaymentAccount().getId() : null
        );
    }
}
