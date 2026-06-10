package com.familyfinance.service;

import com.familyfinance.dto.request.FamilyGroupRequest;
import com.familyfinance.dto.request.InviteMemberRequest;
import com.familyfinance.dto.response.FamilyGroupResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.exception.UnauthorizedException;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyGroupService {

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyGroupMemberRepository memberRepository;
    private final FamilyGroupInviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final CategoryService categoryService;

    @Transactional
    public FamilyGroupResponse create(FamilyGroupRequest request, User currentUser) {
        FamilyGroup group = FamilyGroup.builder()
                .name(request.name())
                .description(request.description())
                .isActive(true)
                .createdBy(currentUser)
                .build();
        group = familyGroupRepository.save(group);

        // Add creator as ADMIN
        FamilyGroupMember member = FamilyGroupMember.builder()
                .familyGroup(group)
                .user(currentUser)
                .role(MemberRole.ADMIN)
                .isActive(true)
                .joinedAt(LocalDateTime.now())
                .build();
        memberRepository.save(member);

        // Create default categories
        categoryService.createDefaultCategories(group, currentUser);

        log.info("Family group created: {} by {}", group.getName(), currentUser.getEmail());
        return toResponse(group, MemberRole.ADMIN);
    }

    public List<FamilyGroupResponse> getUserGroups(User currentUser) {
        return familyGroupRepository.findByMemberUserId(currentUser.getId())
                .stream()
                .map(g -> {
                    MemberRole role = memberRepository.findByFamilyGroupIdAndUserId(g.getId(), currentUser.getId())
                            .map(FamilyGroupMember::getRole)
                            .orElse(MemberRole.VIEWER);
                    return toResponse(g, role);
                })
                .toList();
    }

    public FamilyGroupResponse getById(UUID groupId, User currentUser) {
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyGroup", "id", groupId));
        assertMember(groupId, currentUser.getId());
        MemberRole role = memberRepository.findByFamilyGroupIdAndUserId(groupId, currentUser.getId())
                .map(FamilyGroupMember::getRole)
                .orElse(MemberRole.VIEWER);
        return toResponse(group, role);
    }

    @Transactional
    public FamilyGroupResponse update(UUID groupId, FamilyGroupRequest request, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyGroup", "id", groupId));
        group.setName(request.name());
        group.setDescription(request.description());
        return toResponse(familyGroupRepository.save(group), MemberRole.ADMIN);
    }

    @Transactional
    public void inviteMember(UUID groupId, InviteMemberRequest request, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);

        // Check if already a member
        userRepository.findByEmail(request.email()).ifPresent(u -> {
            if (memberRepository.existsByFamilyGroupIdAndUserIdAndIsActiveTrue(groupId, u.getId())) {
                throw new BusinessException("User is already a member of this group");
            }
        });

        // Check if pending invite exists
        inviteRepository.findByEmailAndFamilyGroupIdAndStatus(request.email(), groupId, InviteStatus.PENDING)
                .ifPresent(i -> { throw new BusinessException("Pending invite already exists for this email"); });

        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyGroup", "id", groupId));

        FamilyGroupInvite invite = FamilyGroupInvite.builder()
                .familyGroup(group)
                .invitedBy(currentUser)
                .email(request.email().toLowerCase())
                .role(request.role())
                .token(UUID.randomUUID().toString())
                .status(InviteStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        inviteRepository.save(invite);
        log.info("Invite sent to {} for group {}", request.email(), groupId);
    }

    @Transactional
    public void acceptInvite(String token, User currentUser) {
        FamilyGroupInvite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invite not found"));

        if (!invite.getStatus().equals(InviteStatus.PENDING)) {
            throw new BusinessException("Invite is no longer valid");
        }
        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            invite.setStatus(InviteStatus.EXPIRED);
            inviteRepository.save(invite);
            throw new BusinessException("Invite has expired");
        }
        if (!invite.getEmail().equalsIgnoreCase(currentUser.getEmail())) {
            throw new UnauthorizedException("This invite was not sent to your email");
        }

        FamilyGroupMember member = FamilyGroupMember.builder()
                .familyGroup(invite.getFamilyGroup())
                .user(currentUser)
                .role(invite.getRole())
                .isActive(true)
                .joinedAt(LocalDateTime.now())
                .build();
        memberRepository.save(member);

        invite.setStatus(InviteStatus.ACCEPTED);
        invite.setRespondedAt(LocalDateTime.now());
        inviteRepository.save(invite);
    }

    public void assertMember(UUID groupId, UUID userId) {
        if (!memberRepository.existsByFamilyGroupIdAndUserIdAndIsActiveTrue(groupId, userId)) {
            throw new UnauthorizedException("You are not a member of this family group");
        }
    }

    public MemberRole getMemberRole(UUID groupId, UUID userId) {
        return memberRepository.findByFamilyGroupIdAndUserId(groupId, userId)
                .map(FamilyGroupMember::getRole)
                .orElseThrow(() -> new UnauthorizedException("Not a member of this group"));
    }

    public void assertRole(UUID groupId, UUID userId, MemberRole minimumRole) {
        MemberRole role = getMemberRole(groupId, userId);
        if (!hasMinimumRole(role, minimumRole)) {
            throw new UnauthorizedException("Insufficient permissions. Required: " + minimumRole);
        }
    }

    private boolean hasMinimumRole(MemberRole actual, MemberRole required) {
        return switch (required) {
            case VIEWER -> true;
            case EDITOR -> actual == MemberRole.EDITOR || actual == MemberRole.ADMIN;
            case ADMIN -> actual == MemberRole.ADMIN;
        };
    }

    private FamilyGroupResponse toResponse(FamilyGroup group, MemberRole currentUserRole) {
        List<FamilyGroupResponse.MemberResponse> members = memberRepository
                .findByFamilyGroupIdAndIsActiveTrue(group.getId())
                .stream()
                .map(m -> new FamilyGroupResponse.MemberResponse(
                        m.getUser().getId(),
                        m.getUser().getName(),
                        m.getUser().getEmail(),
                        m.getUser().getAvatarUrl(),
                        m.getRole(),
                        m.getJoinedAt()
                ))
                .toList();
        return new FamilyGroupResponse(
                group.getId(), group.getName(), group.getDescription(), group.getAvatarUrl(),
                group.getIsActive(), currentUserRole, members, group.getCreatedAt()
        );
    }
}
