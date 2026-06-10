package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record BudgetResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String categoryColor,
        BigDecimal amount,
        BigDecimal spent,
        BigDecimal remaining,
        BigDecimal percentage,
        Integer month,
        Integer year,
        Integer alertPercentage,
        Boolean alertTriggered
) {}
