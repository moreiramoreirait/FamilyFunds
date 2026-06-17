package com.familyfinance.dto.response;

/** Resultado de uma sincronização de Open Finance. */
public record SyncResultResponse(
        int accountsLinked,
        int transactionsImported,
        String status
) {}
