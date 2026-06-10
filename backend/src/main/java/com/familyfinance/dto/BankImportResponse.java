package com.familyfinance.dto;

import com.familyfinance.entity.FileType;
import com.familyfinance.entity.ImportStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record BankImportResponse(
        UUID id,
        UUID accountId,
        String accountName,
        String fileName,
        FileType fileType,
        int totalRecords,
        int importedRecords,
        int skippedRecords,
        ImportStatus status,
        String errorMessage,
        LocalDateTime createdAt,
        List<BankImportItemResponse> items
) {}
