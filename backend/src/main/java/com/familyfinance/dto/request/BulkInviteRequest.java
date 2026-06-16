package com.familyfinance.dto.request;

import com.familyfinance.entity.MemberRole;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Convite em massa: vários e-mails, um único papel para todos. */
public record BulkInviteRequest(
        @NotEmpty(message = "Informe ao menos um e-mail")
        List<String> emails,
        @NotNull(message = "Informe o papel")
        MemberRole role
) {}
