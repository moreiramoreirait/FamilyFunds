package com.familyfinance.service;

import com.familyfinance.dto.request.RecurringExpenseRequest;
import com.familyfinance.dto.response.RecurringExpenseResponse;
import com.familyfinance.dto.response.RecurringExpenseSummaryResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.RecurringExpenseRepository;
import com.familyfinance.repository.TransactionRepository;
import com.familyfinance.service.recurrence.RecurrenceCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringExpenseService {

    private static final int MONTHS_AHEAD = 3;

    private final RecurringExpenseRepository repository;
    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;

    // ─── CRUD ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RecurringExpenseResponse> list(UUID groupId) {
        return repository.findByFamilyGroupIdOrderByCreatedAtDesc(groupId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RecurringExpenseResponse getById(UUID groupId, UUID id) {
        return toResponse(findAndValidate(groupId, id));
    }

    @Transactional
    public RecurringExpenseResponse create(UUID groupId, RecurringExpenseRequest req, User currentUser) {
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);
        RecurringExpense exp = RecurringExpense.builder()
                .familyGroup(group)
                .createdBy(currentUser)
                .description(req.description())
                .amount(req.amount())
                .dueDay(req.dueDay())
                .startDate(req.startDate() != null ? req.startDate() : LocalDate.now())
                .endDate(req.endDate())
                .status(RecurringExpenseStatus.ACTIVE)
                .paymentMethod(req.paymentMethod())
                .recurrenceType(req.recurrenceType())
                .autoGenerate(req.autoGenerate() == null || req.autoGenerate())
                .build();
        applyRefs(exp, req);
        exp.setNextDueDate(computeNextDueDate(exp));
        return toResponse(repository.save(exp));
    }

    @Transactional
    public RecurringExpenseResponse update(UUID groupId, UUID id, RecurringExpenseRequest req) {
        RecurringExpense exp = findAndValidate(groupId, id);
        exp.setDescription(req.description());
        exp.setAmount(req.amount());
        exp.setDueDay(req.dueDay());
        if (req.startDate() != null) exp.setStartDate(req.startDate());
        exp.setEndDate(req.endDate());
        exp.setPaymentMethod(req.paymentMethod());
        exp.setRecurrenceType(req.recurrenceType());
        if (req.autoGenerate() != null) exp.setAutoGenerate(req.autoGenerate());
        applyRefs(exp, req);
        exp.setNextDueDate(computeNextDueDate(exp));
        return toResponse(repository.save(exp));
    }

    // ─── Transições ───────────────────────────────────────────────────────────────

    @Transactional
    public RecurringExpenseResponse pause(UUID groupId, UUID id) {
        RecurringExpense exp = findAndValidate(groupId, id);
        exp.setStatus(RecurringExpenseStatus.PAUSED);
        return toResponse(repository.save(exp));
    }

    @Transactional
    public RecurringExpenseResponse cancel(UUID groupId, UUID id) {
        RecurringExpense exp = findAndValidate(groupId, id);
        exp.setStatus(RecurringExpenseStatus.CANCELLED);
        return toResponse(repository.save(exp));
    }

    @Transactional
    public RecurringExpenseResponse activate(UUID groupId, UUID id) {
        RecurringExpense exp = findAndValidate(groupId, id);
        exp.setStatus(RecurringExpenseStatus.ACTIVE);
        exp.setNextDueDate(computeNextDueDate(exp));
        return toResponse(repository.save(exp));
    }

    // ─── Summary ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RecurringExpenseSummaryResponse getSummary(UUID groupId) {
        List<RecurringExpense> all = repository.findByFamilyGroupIdOrderByCreatedAtDesc(groupId);
        long active = all.stream().filter(e -> e.getStatus() == RecurringExpenseStatus.ACTIVE).count();
        long paused = all.stream().filter(e -> e.getStatus() == RecurringExpenseStatus.PAUSED).count();
        BigDecimal monthlyTotal = all.stream()
                .filter(e -> e.getStatus() == RecurringExpenseStatus.ACTIVE)
                .map(this::monthlyEquivalent)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        RecurringExpense next = all.stream()
                .filter(e -> e.getStatus() == RecurringExpenseStatus.ACTIVE && e.getNextDueDate() != null)
                .min((a, b) -> a.getNextDueDate().compareTo(b.getNextDueDate()))
                .orElse(null);
        return new RecurringExpenseSummaryResponse(
                active, paused, monthlyTotal,
                next != null ? next.getNextDueDate() : null,
                next != null ? next.getDescription() : null,
                next != null ? next.getAmount() : null);
    }

    /** Total mensal estimado das despesas recorrentes ATIVAS (para o dashboard). */
    @Transactional(readOnly = true)
    public BigDecimal monthlyActiveTotal(UUID groupId) {
        return repository.findByFamilyGroupIdAndStatus(groupId, RecurringExpenseStatus.ACTIVE).stream()
                .map(this::monthlyEquivalent).reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    // ─── Geração ─────────────────────────────────────────────────────────────────

    @Transactional
    public int generateCharges(UUID groupId) {
        int created = 0;
        for (RecurringExpense exp : repository.findByFamilyGroupIdAndStatus(groupId, RecurringExpenseStatus.ACTIVE)) {
            created += generateForExpense(exp);
        }
        return created;
    }

    @Transactional
    public int generateAllActive() {
        int created = 0;
        for (RecurringExpense exp : repository.findByStatus(RecurringExpenseStatus.ACTIVE)) {
            created += generateForExpense(exp);
        }
        if (created > 0) log.info("Scheduler: {} lançamento(s) de despesa recorrente gerado(s)", created);
        return created;
    }

    private int generateForExpense(RecurringExpense exp) {
        if (Boolean.FALSE.equals(exp.getAutoGenerate())) return 0;
        LocalDate today = LocalDate.now();
        LocalDate windowStart = today.withDayOfMonth(1);
        LocalDate windowEnd = windowStart.plusMonths(MONTHS_AHEAD).minusDays(1);
        int created = 0;
        List<LocalDate> occurrences = RecurrenceCalculator.occurrences(
                exp.getStartDate(), exp.getDueDay(), exp.getRecurrenceType(),
                exp.getEndDate(), windowStart, windowEnd, today);
        for (LocalDate occ : occurrences) {
            if (transactionRepository.existsByOriginTypeAndOriginIdAndRecurrenceReferenceDate(
                    OriginType.RECURRING_EXPENSE, exp.getId(), occ)) continue;
            transactionService.createGenerated(
                    exp.getFamilyGroup().getId(), OriginType.RECURRING_EXPENSE, exp.getId(), occ,
                    exp.getDescription(), exp.getAmount(),
                    exp.getPaymentAccount() != null ? exp.getPaymentAccount().getId() : null,
                    null,
                    exp.getCategory() != null ? exp.getCategory().getId() : null,
                    exp.getCostCenter() != null ? exp.getCostCenter().getId() : null,
                    exp.getCreatedBy());
            created++;
        }
        exp.setNextDueDate(computeNextDueDate(exp));
        repository.save(exp);
        return created;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private LocalDate computeNextDueDate(RecurringExpense exp) {
        return RecurrenceCalculator.nextOccurrence(
                exp.getStartDate(), exp.getDueDay(), exp.getRecurrenceType(), exp.getEndDate(), LocalDate.now());
    }

    private BigDecimal monthlyEquivalent(RecurringExpense exp) {
        BigDecimal a = exp.getAmount();
        return switch (exp.getRecurrenceType()) {
            case MONTHLY -> a;
            case YEARLY -> a.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case WEEKLY -> a.multiply(BigDecimal.valueOf(52)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case BIWEEKLY -> a.multiply(BigDecimal.valueOf(26)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case DAILY -> a.multiply(BigDecimal.valueOf(30));
        };
    }

    private void applyRefs(RecurringExpense exp, RecurringExpenseRequest req) {
        if (req.categoryId() != null) { Category c = new Category(); c.setId(req.categoryId()); exp.setCategory(c); }
        else exp.setCategory(null);
        if (req.costCenterId() != null) { CostCenter cc = new CostCenter(); cc.setId(req.costCenterId()); exp.setCostCenter(cc); }
        else exp.setCostCenter(null);
        if (req.paymentAccountId() != null) { Account a = new Account(); a.setId(req.paymentAccountId()); exp.setPaymentAccount(a); }
        else exp.setPaymentAccount(null);
    }

    private RecurringExpense findAndValidate(UUID groupId, UUID id) {
        RecurringExpense exp = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringExpense", "id", id));
        if (!exp.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Despesa recorrente não pertence a este grupo");
        }
        return exp;
    }

    private RecurringExpenseResponse toResponse(RecurringExpense e) {
        return new RecurringExpenseResponse(
                e.getId(), e.getDescription(), e.getAmount(), e.getDueDay(),
                e.getStartDate(), e.getEndDate(), e.getStatus(),
                e.getCategory() != null ? e.getCategory().getId() : null,
                e.getCategory() != null ? e.getCategory().getName() : null,
                e.getCostCenter() != null ? e.getCostCenter().getId() : null,
                e.getCostCenter() != null ? e.getCostCenter().getName() : null,
                e.getPaymentAccount() != null ? e.getPaymentAccount().getId() : null,
                e.getPaymentAccount() != null ? e.getPaymentAccount().getName() : null,
                e.getPaymentMethod(), e.getRecurrenceType(), e.getAutoGenerate(),
                e.getNextDueDate(), e.getCreatedAt());
    }
}
