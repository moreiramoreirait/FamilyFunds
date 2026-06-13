package com.familyfinance.dto.response;

import com.familyfinance.entity.ShoppingListStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ShoppingListResponse(
        UUID id,
        String name,
        String description,
        ShoppingListStatus status,
        BigDecimal estimatedTotal,
        UUID convertedPurchaseId,
        List<ShoppingListItemResponse> items,
        LocalDateTime createdAt
) {}
