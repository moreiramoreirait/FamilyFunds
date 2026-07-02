package com.familyfinance.dto;

import java.util.List;

/**
 * Prévia do arquivo para mapeamento manual de colunas: primeiras linhas cruas
 * (já divididas em colunas) + o mapeamento que a detecção automática sugeriu.
 */
public record BankImportPreviewResponse(
        List<List<String>> rows,
        Integer detectedDate,
        Integer detectedDescription,
        Integer detectedAmount,
        Integer detectedCredit,
        Integer detectedDebit
) {}
