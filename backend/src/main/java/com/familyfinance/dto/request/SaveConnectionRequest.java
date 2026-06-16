package com.familyfinance.dto.request;

import jakarta.validation.constraints.NotBlank;

/** Enviado após o widget Pluggy Connect concluir: o itemId da conexão criada. */
public record SaveConnectionRequest(
        @NotBlank(message = "itemId é obrigatório")
        String itemId
) {}
