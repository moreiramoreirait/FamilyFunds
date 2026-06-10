package com.familyfinance.dto.response;

import com.familyfinance.entity.PlanType;
import com.familyfinance.entity.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record SubscriptionResponse(
    UUID id,
    UUID familyGroupId,
    PlanType plan,
    PlanType effectivePlan,
    SubscriptionStatus status,
    LocalDateTime trialEndDate,
    long trialDaysLeft,
    boolean trialActive,
    LocalDateTime currentPeriodEnd,
    // effective limits
    int maxUsers,
    int maxAccounts,
    int maxCreditCards,
    int maxTransactionsPerMonth,
    int maxImportsPerMonth,
    boolean aiEnabled,
    boolean advancedReports,
    String displayName,
    double priceMonthly
) {}
