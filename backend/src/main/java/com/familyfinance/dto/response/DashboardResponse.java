package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        BigDecimal totalBalance,
        BigDecimal monthlyIncome,
        BigDecimal monthlyExpense,
        BigDecimal monthlyResult,
        BigDecimal totalCreditCardsOutstanding,
        long overdueCount,
        long dueSoonCount,
        BigDecimal savingsAmount,
        Double budgetConsumedPercent,
        List<CategoryExpenseItem> expensesByCategory,
        List<MonthlyEvolutionItem> monthlyEvolution,
        List<TransactionResponse> recentTransactions,
        List<TransactionResponse> upcomingDue
) {
    public record CategoryExpenseItem(String categoryId, String categoryName, String color, BigDecimal amount, Double percentage) {}
    public record MonthlyEvolutionItem(String month, BigDecimal income, BigDecimal expense, BigDecimal balance) {}
}
