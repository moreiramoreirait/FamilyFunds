package com.familyfinance.dto.request;

import jakarta.validation.constraints.NotBlank;

/** Confirmação para excluir a própria conta (exige a senha atual). */
public record DeleteAccountRequest(
        @NotBlank(message = "Senha é obrigatória")
        String password
) {}
