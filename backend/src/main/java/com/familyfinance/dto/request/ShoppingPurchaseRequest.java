package com.familyfinance.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ShoppingPurchaseRequest(
        @NotBlank(message = "Mercado é obrigatório")
        String storeName,
        String storeCnpj,

        @NotNull(message = "Data da compra é obrigatória")
        LocalDate purchaseDate,

        BigDecimal totalAmount,
        String paymentMethod,
        UUID accountId,
        UUID creditCardId,
        UUID categoryId,
        String notes,
        String qrCodeUrl,

        @Valid
        List<ShoppingPurchaseItemRequest> items
) {}
