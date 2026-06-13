package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Resumo de preços de um produto + (opcional) registros detalhados. */
public record PriceHistoryResponse(
        String normalizedProductName,
        String productName,
        BigDecimal lastPrice,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String lastStoreName,
        LocalDate lastPurchaseDate,
        long records,
        List<Entry> history
) {
    public record Entry(
            BigDecimal unitPrice,
            BigDecimal quantity,
            String unit,
            String storeName,
            LocalDate purchaseDate
    ) {}
}
