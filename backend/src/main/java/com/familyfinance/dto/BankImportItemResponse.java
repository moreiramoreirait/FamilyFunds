package com.familyfinance.dto;

import com.familyfinance.entity.ImportItemStatus;
import com.familyfinance.entity.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BankImportItemResponse(
        UUID id,
        String description,
        BigDecimal amount,
        LocalDate transactionDate,
        TransactionType type,
        UUID categoryId,
        String categoryName,
        ImportItemStatus status,
        UUID transactionId,
        String rawData
) {}
