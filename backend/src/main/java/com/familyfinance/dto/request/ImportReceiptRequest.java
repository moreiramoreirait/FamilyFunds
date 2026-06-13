package com.familyfinance.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ImportReceiptRequest(
        @NotBlank(message = "URL da NFC-e é obrigatória")
        String url
) {}
