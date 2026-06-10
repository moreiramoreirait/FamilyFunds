package com.familyfinance.dto.response;

import com.familyfinance.entity.MemberRole;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record FamilyGroupResponse(
        UUID id,
        String name,
        String description,
        String avatarUrl,
        Boolean isActive,
        MemberRole currentUserRole,
        List<MemberResponse> members,
        LocalDateTime createdAt
) {
    public record MemberResponse(
            UUID userId,
            String userName,
            String userEmail,
            String userAvatarUrl,
            MemberRole role,
            LocalDateTime joinedAt
    ) {}
}
