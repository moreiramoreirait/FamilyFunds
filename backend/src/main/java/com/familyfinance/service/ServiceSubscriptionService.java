package com.familyfinance.service;

import com.familyfinance.dto.request.ServiceSubscriptionRequest;
import com.familyfinance.dto.response.ServiceSubscriptionResponse;
import com.familyfinance.dto.response.ServiceSubscriptionSummaryResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.ServiceSubscriptionRepository;
import com.familyfinance.repository.TransactionRepository;
import com.familyfinance.service.recurrence.RecurrenceCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceSubscriptionService {

    /** Janela de geração: do início do mês atual até o fim do 3º mês. */
    private static final int MONTHS_AHEAD = 3;

    private final ServiceSubscriptionRepository repository;
    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;

    // ─── CRUD ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ServiceSubscriptionResponse> list(UUID groupId) {
        return repository.findByFamilyGroupIdOrderByCreatedAtDesc(groupId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ServiceSubscriptionResponse getById(UUID groupId, UUID id) {
        return toResponse(findAndValidate(groupId, id));
    }

    @Transactional
    public ServiceSubscriptionResponse create(UUID groupId, ServiceSubscriptionRequest req, User currentUser) {
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);

        ServiceSubscription sub = ServiceSubscription.builder()
                .familyGroup(group)
                .createdBy(currentUser)
                .name(req.name())
                .description(req.description())
                .amount(req.amount())
                .billingDay(req.billingDay())
                .startDate(req.startDate() != null ? req.startDate() : LocalDate.now())
                .endDate(req.endDate())
                .status(ServiceSubscriptionStatus.ACTIVE)
                .paymentMethod(req.paymentMethod())
                .recurrenceType(req.recurrenceType())
                .build();
        applyRefs(sub, req);
        sub.setNextChargeDate(computeNextChargeDate(sub));

        return toResponse(repository.save(sub));
    }

    @Transactional
    public ServiceSubscriptionResponse update(UUID groupId, UUID id, ServiceSubscriptionRequest req) {
        ServiceSubscription sub = findAndValidate(groupId, id);
        sub.setName(req.name());
        sub.setDescription(req.description());
        sub.setAmount(req.amount());
        sub.setBillingDay(req.billingDay());
        if (req.startDate() != null) sub.setStartDate(req.startDate());
        sub.setEndDate(req.endDate());
        sub.setPaymentMethod(req.paymentMethod());
        sub.setRecurrenceType(req.recurrenceType());
        applyRefs(sub, req);
        sub.setNextChargeDate(computeNextChargeDate(sub));
        return toResponse(repository.save(sub));
    }

    // ─── Transições de status ───────────────────────────────────────────────────

    @Transactional
    public ServiceSubscriptionResponse pause(UUID groupId, UUID id) {
        ServiceSubscription sub = findAndValidate(groupId, id);
        sub.setStatus(ServiceSubscriptionStatus.PAUSED);
        return toResponse(repository.save(sub));
    }

    @Transactional
    public ServiceSubscriptionResponse cancel(UUID groupId, UUID id) {
        ServiceSubscription sub = findAndValidate(groupId, id);
        sub.setStatus(ServiceSubscriptionStatus.CANCELLED);
        return toResponse(repository.save(sub));
    }

    @Transactional
    public ServiceSubscriptionResponse activate(UUID groupId, UUID id) {
        ServiceSubscription sub = findAndValidate(groupId, id);
        sub.setStatus(ServiceSubscriptionStatus.ACTIVE);
        sub.setNextChargeDate(computeNextChargeDate(sub));
        return toResponse(repository.save(sub));
    }

    // ─── Summary ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ServiceSubscriptionSummaryResponse getSummary(UUID groupId) {
        List<ServiceSubscription> all = repository.findByFamilyGroupIdOrderByCreatedAtDesc(groupId);
        long active = all.stream().filter(s -> s.getStatus() == ServiceSubscriptionStatus.ACTIVE).count();
        long paused = all.stream().filter(s -> s.getStatus() == ServiceSubscriptionStatus.PAUSED).count();

        BigDecimal monthlyTotal = all.stream()
                .filter(s -> s.getStatus() == ServiceSubscriptionStatus.ACTIVE)
                .map(this::monthlyEquivalent)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        ServiceSubscription next = all.stream()
                .filter(s -> s.getStatus() == ServiceSubscriptionStatus.ACTIVE && s.getNextChargeDate() != null)
                .min((a, b) -> a.getNextChargeDate().compareTo(b.getNextChargeDate()))
                .orElse(null);

        return new ServiceSubscriptionSummaryResponse(
                active, paused, monthlyTotal,
                next != null ? next.getNextChargeDate() : null,
                next != null ? next.getName() : null,
                next != null ? next.getAmount() : null);
    }

    // ─── Geração de lançamentos ───────────────────────────────────────────────────

    /** Gera lançamentos PENDING dos próximos 3 meses para as assinaturas ATIVAS do grupo. Retorna quantos criou. */
    @Transactional
    public int generateCharges(UUID groupId) {
        int created = 0;
        for (ServiceSubscription sub : repository.findByFamilyGroupIdAndStatus(groupId, ServiceSubscriptionStatus.ACTIVE)) {
            created += generateForSubscription(sub);
        }
        return created;
    }

    /** Usado pelo scheduler: gera para todas as assinaturas ATIVAS de todos os grupos. */
    @Transactional
    public int generateAllActive() {
        int created = 0;
        for (ServiceSubscription sub : repository.findByStatus(ServiceSubscriptionStatus.ACTIVE)) {
            created += generateForSubscription(sub);
        }
        if (created > 0) log.info("Scheduler: {} lançamento(s) de assinatura gerado(s)", created);
        return created;
    }

    private int generateForSubscription(ServiceSubscription sub) {
        LocalDate today = LocalDate.now();
        LocalDate windowStart = today.withDayOfMonth(1);
        LocalDate windowEnd = windowStart.plusMonths(MONTHS_AHEAD).minusDays(1);
        int created = 0;
        List<LocalDate> occurrences = RecurrenceCalculator.occurrences(
                sub.getStartDate(), sub.getBillingDay(), sub.getRecurrenceType(),
                sub.getEndDate(), windowStart, windowEnd, today);
        for (LocalDate occ : occurrences) {
            boolean exists = transactionRepository.existsByOriginTypeAndOriginIdAndRecurrenceReferenceDate(
                    OriginType.SUBSCRIPTION, sub.getId(), occ);
            if (exists) continue;
            transactionService.createGenerated(
                    sub.getFamilyGroup().getId(), OriginType.SUBSCRIPTION, sub.getId(), occ,
                    sub.getName(), sub.getAmount(),
                    sub.getPaymentAccount() != null ? sub.getPaymentAccount().getId() : null,
                    sub.getCreditCard() != null ? sub.getCreditCard().getId() : null,
                    sub.getCategory() != null ? sub.getCategory().getId() : null,
                    sub.getCostCenter() != null ? sub.getCostCenter().getId() : null,
                    sub.getCreatedBy());
            created++;
        }
        sub.setNextChargeDate(computeNextChargeDate(sub));
        repository.save(sub);
        return created;
    }

    // ─── Helpers de recorrência ───────────────────────────────────────────────────

    private LocalDate computeNextChargeDate(ServiceSubscription sub) {
        return RecurrenceCalculator.nextOccurrence(
                sub.getStartDate(), sub.getBillingDay(), sub.getRecurrenceType(),
                sub.getEndDate(), LocalDate.now());
    }

    /** Valor normalizado para o mês (para somar assinaturas de períodos diferentes). */
    private BigDecimal monthlyEquivalent(ServiceSubscription sub) {
        BigDecimal a = sub.getAmount();
        return switch (sub.getRecurrenceType()) {
            case MONTHLY -> a;
            case YEARLY -> a.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case WEEKLY -> a.multiply(BigDecimal.valueOf(52)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case DAILY -> a.multiply(BigDecimal.valueOf(30));
        };
    }

    // ─── Internos ─────────────────────────────────────────────────────────────────

    private void applyRefs(ServiceSubscription sub, ServiceSubscriptionRequest req) {
        if (req.categoryId() != null) { Category c = new Category(); c.setId(req.categoryId()); sub.setCategory(c); }
        else sub.setCategory(null);
        if (req.costCenterId() != null) { CostCenter cc = new CostCenter(); cc.setId(req.costCenterId()); sub.setCostCenter(cc); }
        else sub.setCostCenter(null);
        if (req.paymentAccountId() != null) { Account a = new Account(); a.setId(req.paymentAccountId()); sub.setPaymentAccount(a); }
        else sub.setPaymentAccount(null);
        if (req.creditCardId() != null) { CreditCard cr = new CreditCard(); cr.setId(req.creditCardId()); sub.setCreditCard(cr); }
        else sub.setCreditCard(null);
    }

    private ServiceSubscription findAndValidate(UUID groupId, UUID id) {
        ServiceSubscription sub = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceSubscription", "id", id));
        if (!sub.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Assinatura não pertence a este grupo");
        }
        return sub;
    }

    private ServiceSubscriptionResponse toResponse(ServiceSubscription s) {
        return new ServiceSubscriptionResponse(
                s.getId(), s.getName(), s.getDescription(), s.getAmount(), s.getBillingDay(),
                s.getStartDate(), s.getEndDate(), s.getStatus(),
                s.getCategory() != null ? s.getCategory().getId() : null,
                s.getCategory() != null ? s.getCategory().getName() : null,
                s.getCostCenter() != null ? s.getCostCenter().getId() : null,
                s.getCostCenter() != null ? s.getCostCenter().getName() : null,
                s.getPaymentAccount() != null ? s.getPaymentAccount().getId() : null,
                s.getPaymentAccount() != null ? s.getPaymentAccount().getName() : null,
                s.getCreditCard() != null ? s.getCreditCard().getId() : null,
                s.getCreditCard() != null ? s.getCreditCard().getName() : null,
                s.getPaymentMethod(), s.getRecurrenceType(), s.getNextChargeDate(), s.getCreatedAt());
    }
}
