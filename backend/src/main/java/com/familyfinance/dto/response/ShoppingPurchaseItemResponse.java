package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ShoppingPurchaseItemResponse(
        UUID id,
        String productName,
        String category,
        BigDecimal quantity,
        String unit,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        String brand,
        String productCode
) {}
