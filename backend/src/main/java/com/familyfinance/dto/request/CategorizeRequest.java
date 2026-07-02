package com.familyfinance.dto.request;

import com.familyfinance.entity.CategorizeScope;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CategorizeRequest(
        @NotNull UUID categoryId,
        UUID subcategoryId,   // opcional
        @NotNull CategorizeScope scope,
        String keyword   // usado em ALL_MATCHING e THIS_AND_FUTURE (se vazio, usa a descrição)
) {}
