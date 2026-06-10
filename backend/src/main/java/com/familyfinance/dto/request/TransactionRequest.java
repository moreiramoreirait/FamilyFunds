package com.familyfinance.dto.request;

import com.familyfinance.entity.RecurrenceType;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TransactionRequest(
        @NotNull(message = "Type is required")
        TransactionType type,

        @NotBlank(message = "Description is required")
        @Size(max = 255)
        String description,

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be positive")
        BigDecimal amount,

        @NotNull(message = "Transaction date is required")
        LocalDate transactionDate,

        LocalDate dueDate,
        LocalDate paidDate,
        UUID accountId,
        UUID destinationAccountId,
        UUID creditCardId,
        UUID categoryId,
        UUID subcategoryId,
        UUID costCenterId,
        TransactionStatus status,
        Boolean isRecurring,
        RecurrenceType recurrenceType,
        Integer recurrenceInterval,
        LocalDate recurrenceEndDate,
        Boolean isInstallment,
        Integer installmentTotal,
        String notes,
        List<UUID> tagIds
) {}
