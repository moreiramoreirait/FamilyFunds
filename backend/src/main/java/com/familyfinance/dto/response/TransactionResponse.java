package com.familyfinance.dto.response;

import com.familyfinance.entity.OriginType;
import com.familyfinance.entity.RecurrenceType;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        TransactionType type,
        String description,
        BigDecimal amount,
        LocalDate transactionDate,
        LocalDate dueDate,
        LocalDate paidDate,
        UUID accountId,
        String accountName,
        UUID creditCardId,
        String creditCardName,
        UUID categoryId,
        String categoryName,
        String categoryColor,
        String categoryIcon,
        UUID subcategoryId,
        String subcategoryName,
        UUID costCenterId,
        String costCenterName,
        TransactionStatus status,
        Boolean isRecurring,
        RecurrenceType recurrenceType,
        Boolean isInstallment,
        Integer installmentNumber,
        Integer installmentTotal,
        UUID installmentGroupId,
        String notes,
        String attachmentUrl,
        List<TagResponse> tags,
        OriginType originType,
        LocalDateTime createdAt
) {}
