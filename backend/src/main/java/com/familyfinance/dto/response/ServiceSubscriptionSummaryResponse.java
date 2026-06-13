package com.familyfinance.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Resumo das assinaturas de serviço de um grupo.
 * monthlyTotal: total mensal estimado das assinaturas ATIVAS (normalizado para mês).
 */
public record ServiceSubscriptionSummaryResponse(
        long activeCount,
        long pausedCount,
        BigDecimal monthlyTotal,
        LocalDate nextChargeDate,
        String nextChargeName,
        BigDecimal nextChargeAmount
) {}
