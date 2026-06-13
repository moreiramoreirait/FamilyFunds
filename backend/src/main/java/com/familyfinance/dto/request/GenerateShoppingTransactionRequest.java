package com.familyfinance.dto.request;

import com.familyfinance.entity.TransactionStatus;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Parâmetros para gerar a despesa financeira (única, valor total) a partir de uma compra. */
public record GenerateShoppingTransactionRequest(
        @NotNull(message = "Informe o status (PAID ou PENDING)")
        TransactionStatus status,
        UUID accountId,
        UUID creditCardId,
        UUID categoryId
) {}
