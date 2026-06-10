package com.familyfinance.dto.response;

import com.familyfinance.entity.PlanType;
import java.util.List;

public record PlanResponse(
    PlanType type,
    String displayName,
    double priceMonthly,
    int maxUsers,
    int maxAccounts,
    int maxCreditCards,
    int maxTransactionsPerMonth,
    int maxImportsPerMonth,
    boolean aiEnabled,
    boolean advancedReports,
    List<String> features
) {}
