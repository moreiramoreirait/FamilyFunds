package com.familyfinance.dto.response;

import com.familyfinance.entity.RecurrenceType;
import com.familyfinance.entity.ServiceSubscriptionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ServiceSubscriptionResponse(
        UUID id,
        String name,
        String description,
        BigDecimal amount,
        Integer billingDay,
        LocalDate startDate,
        LocalDate endDate,
        ServiceSubscriptionStatus status,
        UUID categoryId,
        String categoryName,
        UUID costCenterId,
        String costCenterName,
        UUID paymentAccountId,
        String paymentAccountName,
        UUID creditCardId,
        String creditCardName,
        String paymentMethod,
        RecurrenceType recurrenceType,
        LocalDate nextChargeDate,
        LocalDateTime createdAt
) {}
