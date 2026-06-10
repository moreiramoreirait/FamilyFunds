package com.familyfinance.dto.response;

import com.familyfinance.entity.PlanType;
import com.familyfinance.entity.SubscriptionStatus;

public record UsageResponse(
    long accountsUsed,   int maxAccounts,
    long cardsUsed,      int maxCreditCards,
    long membersUsed,    int maxUsers,
    long transactionsUsed, int maxTransactionsPerMonth,
    long importsUsed,    int maxImportsPerMonth,
    PlanType effectivePlan,
    SubscriptionStatus status,
    boolean trialActive,
    long trialDaysLeft
) {}
