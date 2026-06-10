package com.familyfinance.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record BudgetRequest(
        UUID categoryId,

        @NotNull @DecimalMin("0.01")
        BigDecimal amount,

        @NotNull @Min(1) @Max(12)
        Integer month,

        @NotNull @Min(2020)
        Integer year,

        @Min(1) @Max(100)
        Integer alertPercentage
) {}
