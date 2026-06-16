package com.familyfinance.dto.response;

import com.familyfinance.entity.InviteStatus;
import com.familyfinance.entity.MemberRole;

import java.time.LocalDateTime;
import java.util.UUID;

public record InviteResponse(
        UUID id,
        String email,
        MemberRole role,
        InviteStatus status,
        String invitedByName,
        LocalDateTime expiresAt,
        LocalDateTime createdAt
) {}
