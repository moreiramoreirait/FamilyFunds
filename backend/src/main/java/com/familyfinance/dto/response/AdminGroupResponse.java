package com.familyfinance.dto.response;

import com.familyfinance.entity.PlanType;
import com.familyfinance.entity.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record AdminGroupResponse(
    UUID id,
    String name,
    String ownerEmail,
    String ownerName,
    int memberCount,
    PlanType plan,
    PlanType effectivePlan,
    SubscriptionStatus subscriptionStatus,
    LocalDateTime trialEndDate,
    LocalDateTime createdAt
) {}
