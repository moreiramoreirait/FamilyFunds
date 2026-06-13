package com.familyfinance.dto.response;

import com.familyfinance.entity.RecurrenceType;
import com.familyfinance.entity.RecurringExpenseStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record RecurringExpenseResponse(
        UUID id,
        String description,
        BigDecimal amount,
        Integer dueDay,
        LocalDate startDate,
        LocalDate endDate,
        RecurringExpenseStatus status,
        UUID categoryId,
        String categoryName,
        UUID costCenterId,
        String costCenterName,
        UUID paymentAccountId,
        String paymentAccountName,
        String paymentMethod,
        RecurrenceType recurrenceType,
        Boolean autoGenerate,
        LocalDate nextDueDate,
        LocalDateTime createdAt
) {}
