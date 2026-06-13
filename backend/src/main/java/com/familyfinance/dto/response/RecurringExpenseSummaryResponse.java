package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RecurringExpenseSummaryResponse(
        long activeCount,
        long pausedCount,
        BigDecimal monthlyTotal,
        LocalDate nextDueDate,
        String nextDueDescription,
        BigDecimal nextDueAmount
) {}
