package com.familyfinance.dto.response;

public record AdminStatsResponse(
    long totalGroups,
    long trialGroups,
    long activeProGroups,
    long activeBusinessGroups,
    long freeGroups,
    long expiredGroups,
    long totalUsers,
    double estimatedMRR
) {}
