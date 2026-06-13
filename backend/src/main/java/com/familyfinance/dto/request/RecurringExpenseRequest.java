package com.familyfinance.dto.request;

import com.familyfinance.entity.RecurrenceType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record RecurringExpenseRequest(
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 160)
        String description,

        @NotNull(message = "Valor é obrigatório")
        @Positive(message = "Valor deve ser positivo")
        BigDecimal amount,

        @Min(1) @Max(31)
        Integer dueDay,

        LocalDate startDate,
        LocalDate endDate,

        UUID categoryId,
        UUID costCenterId,
        UUID paymentAccountId,
        String paymentMethod,

        @NotNull(message = "Tipo de recorrência é obrigatório")
        RecurrenceType recurrenceType,

        Boolean autoGenerate
) {}
