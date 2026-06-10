package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCardResponse(
        UUID id,
        String name,
        String brand,
        String lastFourDigits,
        BigDecimal creditLimit,
        BigDecimal availableLimit,
        Integer closingDay,
        Integer dueDay,
        String color,
        String icon,
        Boolean isActive
) {}
