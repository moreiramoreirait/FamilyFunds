package com.familyfinance.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreditCardRequest(
        @NotBlank(message = "Nome é obrigatório")
        String name,

        @NotBlank(message = "Bandeira é obrigatória")
        String brand,

        @Size(min = 4, max = 4, message = "Últimos 4 dígitos devem ter exatamente 4 caracteres")
        String lastFourDigits,

        @NotNull @DecimalMin("0.01")
        BigDecimal creditLimit,

        @NotNull @Min(1) @Max(31)
        Integer closingDay,

        @NotNull @Min(1) @Max(31)
        Integer dueDay,

        String color,
        String icon
) {}
