package com.familyfinance.dto.response;

import com.familyfinance.entity.AiProvider;
import java.util.UUID;

public record AiSettingResponse(
        UUID id,
        AiProvider provider,
        String model,
        Boolean isActive,
        String maskedApiKey
) {}
