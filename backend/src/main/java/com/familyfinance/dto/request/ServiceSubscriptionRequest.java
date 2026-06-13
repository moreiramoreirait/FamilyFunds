package com.familyfinance.dto.request;

import com.familyfinance.entity.RecurrenceType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ServiceSubscriptionRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 120)
        String name,

        String description,

        @NotNull(message = "Valor é obrigatório")
        @Positive(message = "Valor deve ser positivo")
        BigDecimal amount,

        @Min(1) @Max(31)
        Integer billingDay,

        LocalDate startDate,
        LocalDate endDate,

        UUID categoryId,
        UUID costCenterId,
        UUID paymentAccountId,
        UUID creditCardId,
        String paymentMethod,

        @NotNull(message = "Tipo de recorrência é obrigatório")
        RecurrenceType recurrenceType
) {}
