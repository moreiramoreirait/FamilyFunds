package com.familyfinance.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ShoppingListRequest(
        @NotBlank(message = "Nome da lista é obrigatório")
        String name,
        String description,
        @Valid
        List<ShoppingListItemRequest> items
) {}
