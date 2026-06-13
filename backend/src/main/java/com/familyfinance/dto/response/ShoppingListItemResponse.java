package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ShoppingListItemResponse(
        UUID id,
        String productName,
        String category,
        BigDecimal quantity,
        String unit,
        BigDecimal estimatedUnitPrice,
        BigDecimal estimatedTotalPrice,
        BigDecimal lastPaidPrice,
        String preferredStore,
        boolean checked,
        BigDecimal realUnitPrice,
        BigDecimal realTotalPrice
) {}
