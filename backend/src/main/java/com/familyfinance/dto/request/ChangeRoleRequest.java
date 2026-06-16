package com.familyfinance.dto.request;

import com.familyfinance.entity.MemberRole;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(
        @NotNull(message = "Informe o papel")
        MemberRole role
) {}
