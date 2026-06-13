package com.familyfinance.dto.request;

import java.time.LocalDate;
import java.util.UUID;

/** Parâmetros opcionais ao converter uma lista em compra (RASCUNHO). */
public record ConvertListRequest(
        String storeName,
        LocalDate purchaseDate,
        String paymentMethod,
        UUID accountId,
        UUID creditCardId,
        UUID categoryId
) {}
