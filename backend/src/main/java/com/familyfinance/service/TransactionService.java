package com.familyfinance.service;

import com.familyfinance.dto.request.TransactionRequest;
import com.familyfinance.dto.response.TagResponse;
import com.familyfinance.dto.response.TransactionResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final CostCenterRepository costCenterRepository;
    private final CreditCardRepository creditCardRepository;
    private final TagRepository tagRepository;
    private final AccountService accountService;
    private final SubscriptionService subscriptionService;

    public Page<TransactionResponse> getAll(UUID familyGroupId, int page, int size) {
        return transactionRepository.findByFamilyGroupIdOrderByTransactionDateDesc(
                        familyGroupId, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    public TransactionResponse getById(UUID familyGroupId, UUID transactionId) {
        Transaction t = findAndValidate(familyGroupId, transactionId);
        return toResponse(t);
    }

    @Transactional
    public TransactionResponse create(UUID familyGroupId, TransactionRequest request, User currentUser) {
        subscriptionService.checkTransactionLimit(familyGroupId);
        FamilyGroup group = new FamilyGroup();
        group.setId(familyGroupId);

        Transaction t = buildTransaction(request, group, currentUser);
        t = transactionRepository.save(t);

        // Update account balance if paid
        if (request.accountId() != null && isPaid(t)) {
            updateAccountBalance(t, true);
        }

        return toResponse(t);
    }

    @Transactional
    public List<TransactionResponse> createInstallments(UUID familyGroupId, TransactionRequest request, User currentUser) {
        if (request.installmentTotal() == null || request.installmentTotal() < 2) {
            throw new BusinessException("Installment total must be at least 2");
        }
        FamilyGroup group = new FamilyGroup();
        group.setId(familyGroupId);

        UUID installmentGroupId = UUID.randomUUID();
        List<TransactionResponse> results = new ArrayList<>();

        for (int i = 1; i <= request.installmentTotal(); i++) {
            int finalI = i;
            LocalDate date = request.transactionDate().plusMonths(i - 1);

            FamilyGroup fg = new FamilyGroup(); fg.setId(familyGroupId);
            Transaction t = buildTransaction(request, fg, currentUser);
            t.setInstallmentGroupId(installmentGroupId);
            t.setInstallmentNumber(finalI);
            t.setInstallmentTotal(request.installmentTotal());
            t.setIsInstallment(true);
            t.setTransactionDate(date);
            t.setDueDate(date);
            t.setDescription(request.description() + " (" + finalI + "/" + request.installmentTotal() + ")");
            t.setStatus(TransactionStatus.PENDING);
            results.add(toResponse(transactionRepository.save(t)));
        }
        return results;
    }

    @Transactional
    public TransactionResponse update(UUID familyGroupId, UUID transactionId, TransactionRequest request) {
        Transaction existing = findAndValidate(familyGroupId, transactionId);
        boolean wasPaid = isPaid(existing);
        UUID oldAccountId = existing.getAccount() != null ? existing.getAccount().getId() : null;
        BigDecimal oldAmount = existing.getAmount();

        // Reverse old balance effect
        if (oldAccountId != null && wasPaid) {
            BigDecimal delta = existing.getType() == TransactionType.INCOME ? oldAmount.negate() : oldAmount;
            accountService.updateBalance(oldAccountId, delta);
        }

        FamilyGroup group = new FamilyGroup();
        group.setId(familyGroupId);
        updateTransaction(existing, request);
        existing = transactionRepository.save(existing);

        // Apply new balance effect
        if (request.accountId() != null && isPaid(existing)) {
            updateAccountBalance(existing, true);
        }

        return toResponse(existing);
    }

    @Transactional
    public TransactionResponse markAsPaid(UUID familyGroupId, UUID transactionId, LocalDate paidDate) {
        Transaction t = findAndValidate(familyGroupId, transactionId);
        if (t.getStatus() == TransactionStatus.PAID) {
            throw new BusinessException("Transaction is already paid");
        }
        TransactionStatus oldStatus = t.getStatus();
        t.setStatus(TransactionStatus.PAID);
        t.setPaidDate(paidDate != null ? paidDate : LocalDate.now());
        t = transactionRepository.save(t);
        if (t.getAccount() != null && oldStatus != TransactionStatus.PAID) {
            updateAccountBalance(t, true);
        }
        return toResponse(t);
    }

    @Transactional
    public void delete(UUID familyGroupId, UUID transactionId) {
        Transaction t = findAndValidate(familyGroupId, transactionId);
        if (isPaid(t) && t.getAccount() != null) {
            updateAccountBalance(t, false);
        }
        t.setStatus(TransactionStatus.CANCELLED);
        transactionRepository.save(t);
    }

    private Transaction buildTransaction(TransactionRequest request, FamilyGroup group, User currentUser) {
        Transaction.TransactionBuilder builder = Transaction.builder()
                .familyGroup(group)
                .type(request.type())
                .description(request.description())
                .amount(request.amount())
                .transactionDate(request.transactionDate())
                .dueDate(request.dueDate())
                .paidDate(request.paidDate())
                .isRecurring(request.isRecurring() != null ? request.isRecurring() : false)
                .recurrenceType(request.recurrenceType())
                .recurrenceInterval(request.recurrenceInterval() != null ? request.recurrenceInterval() : 0)
                .recurrenceEndDate(request.recurrenceEndDate())
                .isInstallment(request.isInstallment() != null ? request.isInstallment() : false)
                .notes(request.notes())
                .createdBy(currentUser)
                .status(request.status() != null ? request.status() : TransactionStatus.PENDING);

        if (request.accountId() != null) {
            Account acc = new Account(); acc.setId(request.accountId());
            builder.account(acc);
        }
        if (request.destinationAccountId() != null) {
            Account acc = new Account(); acc.setId(request.destinationAccountId());
            builder.destinationAccount(acc);
        }
        if (request.categoryId() != null) {
            Category cat = new Category(); cat.setId(request.categoryId());
            builder.category(cat);
        }
        if (request.subcategoryId() != null) {
            Subcategory sub = new Subcategory(); sub.setId(request.subcategoryId());
            builder.subcategory(sub);
        }
        if (request.costCenterId() != null) {
            CostCenter cc = new CostCenter(); cc.setId(request.costCenterId());
            builder.costCenter(cc);
        }

        Transaction t = builder.build();

        if (request.tagIds() != null && !request.tagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.tagIds()));
            t.setTags(tags);
        }
        return t;
    }

    private void updateTransaction(Transaction t, TransactionRequest r) {
        t.setType(r.type());
        t.setDescription(r.description());
        t.setAmount(r.amount());
        t.setTransactionDate(r.transactionDate());
        t.setDueDate(r.dueDate());
        t.setPaidDate(r.paidDate());
        t.setNotes(r.notes());
        if (r.status() != null) t.setStatus(r.status());
        if (r.accountId() != null) { Account a = new Account(); a.setId(r.accountId()); t.setAccount(a); }
        if (r.categoryId() != null) { Category c = new Category(); c.setId(r.categoryId()); t.setCategory(c); }
        if (r.subcategoryId() != null) { Subcategory s = new Subcategory(); s.setId(r.subcategoryId()); t.setSubcategory(s); }
        if (r.costCenterId() != null) { CostCenter cc = new CostCenter(); cc.setId(r.costCenterId()); t.setCostCenter(cc); }
        if (r.tagIds() != null) {
            t.setTags(new HashSet<>(tagRepository.findAllById(r.tagIds())));
        }
    }

    private boolean isPaid(Transaction t) {
        return t.getStatus() == TransactionStatus.PAID;
    }

    private void updateAccountBalance(Transaction t, boolean apply) {
        if (t.getAccount() == null) return;
        BigDecimal amount = t.getAmount();
        BigDecimal delta;
        if (t.getType() == TransactionType.INCOME) {
            delta = apply ? amount : amount.negate();
        } else {
            delta = apply ? amount.negate() : amount;
        }
        accountService.updateBalance(t.getAccount().getId(), delta);
    }

    private Transaction findAndValidate(UUID familyGroupId, UUID transactionId) {
        Transaction t = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", "id", transactionId));
        if (!t.getFamilyGroup().getId().equals(familyGroupId)) {
            throw new BusinessException("Transaction does not belong to this group");
        }
        return t;
    }

    public TransactionResponse toResponse(Transaction t) {
        List<TagResponse> tags = t.getTags() != null
                ? t.getTags().stream().map(tag -> new TagResponse(tag.getId(), tag.getName(), tag.getColor())).toList()
                : List.of();
        return new TransactionResponse(
                t.getId(), t.getType(), t.getDescription(), t.getAmount(),
                t.getTransactionDate(), t.getDueDate(), t.getPaidDate(),
                t.getAccount() != null ? t.getAccount().getId() : null,
                t.getAccount() != null ? t.getAccount().getName() : null,
                t.getCreditCard() != null ? t.getCreditCard().getId() : null,
                t.getCreditCard() != null ? t.getCreditCard().getName() : null,
                t.getCategory() != null ? t.getCategory().getId() : null,
                t.getCategory() != null ? t.getCategory().getName() : null,
                t.getCategory() != null ? t.getCategory().getColor() : null,
                t.getCategory() != null ? t.getCategory().getIcon() : null,
                t.getSubcategory() != null ? t.getSubcategory().getId() : null,
                t.getSubcategory() != null ? t.getSubcategory().getName() : null,
                t.getCostCenter() != null ? t.getCostCenter().getId() : null,
                t.getCostCenter() != null ? t.getCostCenter().getName() : null,
                t.getStatus(), t.getIsRecurring(), t.getRecurrenceType(),
                t.getIsInstallment(), t.getInstallmentNumber(), t.getInstallmentTotal(),
                t.getInstallmentGroupId(), t.getNotes(), t.getAttachmentUrl(),
                tags, t.getCreatedAt()
        );
    }
}
