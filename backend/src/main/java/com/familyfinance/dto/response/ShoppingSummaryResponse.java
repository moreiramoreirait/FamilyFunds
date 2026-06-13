package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Cards do hub do módulo Compras Inteligentes. */
public record ShoppingSummaryResponse(
        BigDecimal monthTotal,
        long monthPurchaseCount,
        LocalDate lastPurchaseDate,
        String lastPurchaseStore,
        BigDecimal lastPurchaseAmount,
        long trackedProducts
) {}
