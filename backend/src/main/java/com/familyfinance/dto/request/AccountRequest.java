package com.familyfinance.dto.request;

import com.familyfinance.entity.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AccountRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 100) String bankName,
        @NotNull AccountType type,
        BigDecimal initialBalance,
        String color,
        String icon,
        Boolean includeInTotal,
        String notes
) {}
