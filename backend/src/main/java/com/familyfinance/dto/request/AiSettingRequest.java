package com.familyfinance.dto.request;

import com.familyfinance.entity.AiProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AiSettingRequest(
        @NotNull AiProvider provider,
        @NotBlank String apiKey,
        String model,
        Boolean isActive
) {}
