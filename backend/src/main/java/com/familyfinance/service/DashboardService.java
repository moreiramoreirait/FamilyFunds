package com.familyfinance.service;

import com.familyfinance.dto.response.DashboardResponse;
import com.familyfinance.dto.response.TransactionResponse;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;
import com.familyfinance.repository.AccountRepository;
import com.familyfinance.repository.CreditCardInvoiceRepository;
import com.familyfinance.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final TransactionService transactionService;
    private final ServiceSubscriptionService serviceSubscriptionService;
    private final RecurringExpenseService recurringExpenseService;

    public DashboardResponse getDashboard(UUID familyGroupId) {
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate monthEnd = now.withDayOfMonth(now.lengthOfMonth());

        BigDecimal totalBalance = accountRepository.sumBalanceByFamilyGroupId(familyGroupId);
        BigDecimal monthlyIncome = transactionRepository.sumByTypeAndPeriod(familyGroupId, TransactionType.INCOME, monthStart, monthEnd);
        BigDecimal monthlyExpense = transactionRepository.sumByTypeAndPeriod(familyGroupId, TransactionType.EXPENSE, monthStart, monthEnd);
        BigDecimal monthlyResult = monthlyIncome.subtract(monthlyExpense);
        BigDecimal totalCards = invoiceRepository.sumOutstandingByFamilyGroup(familyGroupId);

        List<TransactionResponse> recent = transactionRepository
                .findRecentByFamilyGroupId(familyGroupId, PageRequest.of(0, 10))
                .stream().map(transactionService::toResponse).toList();

        List<TransactionResponse> upcoming = transactionRepository
                .findUpcomingDue(familyGroupId, now, now.plusDays(7))
                .stream().map(transactionService::toResponse).toList();

        long overdueCount = transactionRepository
                .findByFamilyGroupIdAndStatusAndDueDateBefore(familyGroupId, TransactionStatus.PENDING, now)
                .size();

        long dueSoonCount = upcoming.size();

        // Expenses by category
        List<DashboardResponse.CategoryExpenseItem> expensesByCategory = transactionRepository
                .sumExpensesByCategory(familyGroupId, monthStart, monthEnd)
                .stream()
                .map(row -> {
                    String catId = row[0] != null ? row[0].toString() : null;
                    String catName = row[1] != null ? row[1].toString() : "Sem Categoria";
                    BigDecimal amount = row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;
                    double pct = monthlyExpense.compareTo(BigDecimal.ZERO) > 0
                            ? amount.divide(monthlyExpense, 4, RoundingMode.HALF_UP).doubleValue() * 100
                            : 0.0;
                    return new DashboardResponse.CategoryExpenseItem(catId, catName, null, amount, pct);
                }).toList();

        // Monthly evolution (last 6 months)
        List<DashboardResponse.MonthlyEvolutionItem> evolution = transactionRepository
                .getMonthlyEvolution(familyGroupId, now.minusMonths(5).withDayOfMonth(1))
                .stream()
                .map(row -> {
                    String month = row[0] != null ? row[0].toString().substring(0, 7) : "";
                    BigDecimal income = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                    BigDecimal expense = row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;
                    return new DashboardResponse.MonthlyEvolutionItem(month, income, expense, income.subtract(expense));
                }).toList();

        double budgetPct = 0.0;
        BigDecimal savings = monthlyResult.compareTo(BigDecimal.ZERO) > 0 ? monthlyResult : BigDecimal.ZERO;

        // Recorrências (assinaturas + despesas recorrentes)
        BigDecimal monthlySubs = serviceSubscriptionService.monthlyActiveTotal(familyGroupId);
        BigDecimal monthlyRecurring = recurringExpenseService.monthlyActiveTotal(familyGroupId);
        long upcomingRecurring = serviceSubscriptionService.upcomingChargesCount(familyGroupId);
        BigDecimal recurringTotal = monthlySubs.add(monthlyRecurring);
        double recurringPct = monthlyIncome.compareTo(BigDecimal.ZERO) > 0
                ? recurringTotal.divide(monthlyIncome, 4, RoundingMode.HALF_UP).doubleValue() * 100
                : 0.0;

        return new DashboardResponse(
                totalBalance, monthlyIncome, monthlyExpense, monthlyResult,
                totalCards, overdueCount, dueSoonCount, savings, budgetPct,
                expensesByCategory, evolution, recent, upcoming,
                monthlySubs, monthlyRecurring, upcomingRecurring, recurringPct
        );
    }
}
