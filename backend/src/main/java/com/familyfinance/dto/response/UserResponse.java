package com.familyfinance.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String avatarUrl,
        String phone,
        Boolean emailVerified,
        Boolean isSystemAdmin,
        LocalDateTime createdAt
) {}
