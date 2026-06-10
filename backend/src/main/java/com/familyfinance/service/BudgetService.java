package com.familyfinance.service;

import com.familyfinance.dto.request.BudgetRequest;
import com.familyfinance.dto.response.BudgetResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final FamilyGroupService familyGroupService;

    public List<BudgetResponse> findAll(UUID groupId, int month, int year, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        return budgetRepository.findByFamilyGroupIdAndMonthAndYear(groupId, month, year)
                .stream()
                .map(b -> toResponse(b, month, year))
                .collect(Collectors.toList());
    }

    public BudgetResponse findById(UUID groupId, UUID budgetId, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        Budget b = budgetRepository.findById(budgetId)
                .filter(budget -> budget.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Orçamento não encontrado"));
        return toResponse(b, b.getMonth(), b.getYear());
    }

    public BudgetResponse create(UUID groupId, BudgetRequest req, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);

        FamilyGroup group = new FamilyGroup();
        group.setId(groupId);

        Category category = null;
        if (req.categoryId() != null) {
            category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        }

        Budget budget = Budget.builder()
                .familyGroup(group)
                .category(category)
                .plannedAmount(req.amount())
                .month(req.month())
                .year(req.year())
                .alertAtPercent(req.alertPercentage() != null ? req.alertPercentage() : 80)
                .createdBy(currentUser)
                .build();

        return toResponse(budgetRepository.save(budget), req.month(), req.year());
    }

    public BudgetResponse update(UUID groupId, UUID budgetId, BudgetRequest req, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        Budget budget = budgetRepository.findById(budgetId)
                .filter(b -> b.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Orçamento não encontrado"));

        budget.setPlannedAmount(req.amount());
        if (req.alertPercentage() != null) {
            budget.setAlertAtPercent(req.alertPercentage());
        }

        return toResponse(budgetRepository.save(budget), budget.getMonth(), budget.getYear());
    }

    public void delete(UUID groupId, UUID budgetId, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        Budget budget = budgetRepository.findById(budgetId)
                .filter(b -> b.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Orçamento não encontrado"));
        budgetRepository.delete(budget);
    }

    private BudgetResponse toResponse(Budget b, int month, int year) {
        BigDecimal spent = BigDecimal.ZERO;
        if (b.getCategory() != null) {
            LocalDate startDate = LocalDate.of(year, month, 1);
            LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
            BigDecimal result = transactionRepository.sumByTypeAndCategoryAndPeriod(
                    b.getFamilyGroup().getId(),
                    TransactionType.EXPENSE,
                    b.getCategory().getId(),
                    startDate,
                    endDate
            );
            spent = result != null ? result : BigDecimal.ZERO;
        }

        BigDecimal planned = b.getPlannedAmount();
        BigDecimal percentage = planned.compareTo(BigDecimal.ZERO) > 0
                ? spent.divide(planned, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        boolean alertTriggered = percentage.compareTo(BigDecimal.valueOf(b.getAlertAtPercent())) >= 0;

        return new BudgetResponse(
                b.getId(),
                b.getCategory() != null ? b.getCategory().getId() : null,
                b.getCategory() != null ? b.getCategory().getName() : "Total",
                b.getCategory() != null ? b.getCategory().getColor() : null,
                planned,
                spent,
                planned.subtract(spent),
                percentage,
                b.getMonth(),
                b.getYear(),
                b.getAlertAtPercent(),
                alertTriggered
        );
    }
}
