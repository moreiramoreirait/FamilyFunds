package com.familyfinance.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record ShoppingListItemRequest(
        @NotBlank(message = "Nome do produto é obrigatório")
        String productName,
        String category,
        BigDecimal quantity,
        String unit,
        BigDecimal estimatedUnitPrice,
        String preferredStore,
        Boolean checked,
        BigDecimal realUnitPrice
) {}
