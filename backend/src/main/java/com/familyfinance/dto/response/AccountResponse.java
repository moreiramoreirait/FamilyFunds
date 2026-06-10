package com.familyfinance.dto.response;

import com.familyfinance.entity.AccountType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        String name,
        String bankName,
        AccountType type,
        BigDecimal initialBalance,
        BigDecimal currentBalance,
        String color,
        String icon,
        Boolean isActive,
        Boolean includeInTotal,
        String notes,
        LocalDateTime createdAt
) {}
