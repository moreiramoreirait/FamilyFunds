package com.familyfinance.dto;

import java.util.List;
import java.util.UUID;

public record ConfirmImportRequest(
        List<UUID> itemIds
) {}
