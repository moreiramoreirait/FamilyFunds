package com.familyfinance.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record ShoppingPurchaseItemRequest(
        @NotBlank(message = "Nome do produto é obrigatório")
        String productName,
        String category,
        BigDecimal quantity,
        String unit,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        String brand,
        String productCode
) {}
