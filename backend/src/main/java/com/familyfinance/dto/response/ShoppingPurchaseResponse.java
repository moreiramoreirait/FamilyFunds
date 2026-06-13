package com.familyfinance.dto.response;

import com.familyfinance.entity.ExtractionStatus;
import com.familyfinance.entity.PurchaseStatus;
import com.familyfinance.entity.ShoppingSourceType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ShoppingPurchaseResponse(
        UUID id,
        String storeName,
        String storeCnpj,
        LocalDate purchaseDate,
        BigDecimal totalAmount,
        String paymentMethod,
        UUID accountId,
        String accountName,
        UUID creditCardId,
        String creditCardName,
        UUID categoryId,
        String categoryName,
        ShoppingSourceType sourceType,
        String qrCodeUrl,
        String accessKey,
        ExtractionStatus extractionStatus,
        String extractionError,
        UUID financialTransactionId,
        PurchaseStatus status,
        String notes,
        List<ShoppingPurchaseItemResponse> items,
        LocalDateTime createdAt
) {}
