package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreditCardInvoiceResponse(
        UUID id,
        UUID creditCardId,
        String creditCardName,
        Integer referenceMonth,
        Integer referenceYear,
        LocalDate closingDate,
        LocalDate dueDate,
        BigDecimal totalAmount,
        String status,
        LocalDate paidAt,
        UUID paymentAccountId
) {}
