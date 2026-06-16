package com.familyfinance.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record BankConnectionResponse(
        UUID id,
        String connectorName,
        String connectorImageUrl,
        String status,
        String statusDetail,
        LocalDateTime lastSyncedAt,
        LocalDateTime createdAt
) {}
