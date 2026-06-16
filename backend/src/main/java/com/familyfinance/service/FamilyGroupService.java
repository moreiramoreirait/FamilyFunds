package com.familyfinance.service;

import com.familyfinance.dto.request.BulkInviteRequest;
import com.familyfinance.dto.request.FamilyGroupRequest;
import com.familyfinance.dto.request.InviteMemberRequest;
import com.familyfinance.dto.response.BulkInviteResponse;
import com.familyfinance.dto.response.FamilyGroupResponse;
import com.familyfinance.dto.response.InviteResponse;
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
import java.util.ArrayList;
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
    private final SubscriptionService subscriptionService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Transactional
    public FamilyGroupResponse create(FamilyGroupRequest request, User currentUser) {
        subscriptionService.assertCanCreateFamily(currentUser);

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

        // Create trial subscription
        subscriptionService.createTrialSubscription(group);

        log.info("Family group created: {} by {}", group.getName(), currentUser.getEmail());
        return toResponse(group, MemberRole.ADMIN);
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
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
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyGroup", "id", groupId));
        if (applyInvite(group, request.email(), request.role(), currentUser) == InviteOutcome.ALREADY_MEMBER) {
            throw new BusinessException("Esta pessoa já é membro do grupo");
        }
    }

    @Transactional
    public BulkInviteResponse bulkInvite(UUID groupId, BulkInviteRequest request, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyGroup", "id", groupId));

        List<String> emails = request.emails().stream()
                .filter(e -> e != null && !e.isBlank())
                .map(e -> e.trim().toLowerCase())
                .distinct().toList();

        List<BulkInviteResponse.Item> results = new ArrayList<>();
        int sent = 0, skipped = 0, failed = 0;
        for (String email : emails) {
            try {
                InviteOutcome outcome = applyInvite(group, email, request.role(), currentUser);
                switch (outcome) {
                    case SENT -> { sent++; results.add(new BulkInviteResponse.Item(email, "SENT", "Convite enviado")); }
                    case RESENT -> { sent++; results.add(new BulkInviteResponse.Item(email, "RESENT", "Convite reenviado")); }
                    case ALREADY_MEMBER -> { skipped++; results.add(new BulkInviteResponse.Item(email, "ALREADY_MEMBER", "Já é membro")); }
                }
            } catch (Exception e) {
                failed++;
                results.add(new BulkInviteResponse.Item(email, "ERROR", e.getMessage()));
            }
        }
        return new BulkInviteResponse(sent, skipped, failed, results);
    }

    private enum InviteOutcome { SENT, RESENT, ALREADY_MEMBER }

    /** Cria ou reenvia (renova token/validade) um convite. Não lança se já for membro: retorna ALREADY_MEMBER. */
    private InviteOutcome applyInvite(FamilyGroup group, String rawEmail, MemberRole role, User currentUser) {
        String email = rawEmail.trim().toLowerCase();
        var existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()
                && memberRepository.existsByFamilyGroupIdAndUserIdAndIsActiveTrue(group.getId(), existingUser.get().getId())) {
            return InviteOutcome.ALREADY_MEMBER;
        }
        FamilyGroupInvite invite = inviteRepository
                .findByEmailAndFamilyGroupIdAndStatus(email, group.getId(), InviteStatus.PENDING)
                .orElse(null);
        InviteOutcome outcome;
        if (invite != null) {
            invite.setRole(role);
            invite.setInvitedBy(currentUser);
            invite.setToken(UUID.randomUUID().toString());
            invite.setExpiresAt(LocalDateTime.now().plusDays(7));
            outcome = InviteOutcome.RESENT;
        } else {
            subscriptionService.checkMemberLimit(group.getId());
            invite = FamilyGroupInvite.builder()
                    .familyGroup(group)
                    .invitedBy(currentUser)
                    .email(email)
                    .role(role)
                    .token(UUID.randomUUID().toString())
                    .status(InviteStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .build();
            outcome = InviteOutcome.SENT;
        }
        inviteRepository.save(invite);
        emailService.sendInviteEmail(invite, group.getName());
        log.info("Invite ({}) to {} for group {}", outcome, email, group.getId());
        return outcome;
    }

    @Transactional(readOnly = true)
    public List<InviteResponse> listPendingInvites(UUID groupId, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        return inviteRepository.findByFamilyGroupIdAndStatus(groupId, InviteStatus.PENDING).stream()
                .map(i -> new InviteResponse(
                        i.getId(), i.getEmail(), i.getRole(), i.getStatus(),
                        i.getInvitedBy() != null ? i.getInvitedBy().getName() : null,
                        i.getExpiresAt(), i.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void revokeInvite(UUID groupId, UUID inviteId, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        FamilyGroupInvite invite = inviteRepository.findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Convite não encontrado"));
        if (!invite.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Convite não pertence a este grupo");
        }
        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new BusinessException("Só é possível revogar convites pendentes");
        }
        invite.setStatus(InviteStatus.REJECTED);
        invite.setRespondedAt(LocalDateTime.now());
        inviteRepository.save(invite);
    }

    @Transactional
    public void changeMemberRole(UUID groupId, UUID targetUserId, MemberRole newRole, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        FamilyGroupMember member = memberRepository.findByFamilyGroupIdAndUserId(groupId, targetUserId)
                .filter(m -> Boolean.TRUE.equals(m.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Membro não encontrado neste grupo"));
        if (member.getRole() == MemberRole.ADMIN && newRole != MemberRole.ADMIN && countActiveAdmins(groupId) <= 1) {
            throw new BusinessException("Não é possível rebaixar o último administrador do grupo");
        }
        member.setRole(newRole);
        memberRepository.save(member);
    }

    @Transactional
    public void removeMember(UUID groupId, UUID targetUserId, User currentUser) {
        assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        FamilyGroupMember member = memberRepository.findByFamilyGroupIdAndUserId(groupId, targetUserId)
                .filter(m -> Boolean.TRUE.equals(m.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Membro não encontrado neste grupo"));
        if (member.getRole() == MemberRole.ADMIN && countActiveAdmins(groupId) <= 1) {
            throw new BusinessException("Não é possível remover o último administrador do grupo");
        }
        member.setIsActive(false);
        memberRepository.save(member);
    }

    private long countActiveAdmins(UUID groupId) {
        return memberRepository.findByFamilyGroupIdAndIsActiveTrue(groupId).stream()
                .filter(m -> m.getRole() == MemberRole.ADMIN)
                .count();
    }

    @Transactional
    public void acceptInvite(String token, User currentUser) {
        FamilyGroupInvite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Convite não encontrado"));

        if (!invite.getStatus().equals(InviteStatus.PENDING)) {
            throw new BusinessException("Este convite não é mais válido");
        }
        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            invite.setStatus(InviteStatus.EXPIRED);
            inviteRepository.save(invite);
            throw new BusinessException("Este convite expirou");
        }
        if (!invite.getEmail().equalsIgnoreCase(currentUser.getEmail())) {
            throw new UnauthorizedException("Este convite foi enviado para outro e-mail");
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

        notificationService.notifyMembersOfAction(invite.getFamilyGroup().getId(), currentUser.getId(),
                "Novo membro",
                String.format("%s entrou no grupo", currentUser.getName()),
                "MEMBER_JOINED");
    }

    public void assertMember(UUID groupId, UUID userId) {
        if (!memberRepository.existsByFamilyGroupIdAndUserIdAndIsActiveTrue(groupId, userId)) {
            throw new UnauthorizedException("Você não é membro deste grupo familiar");
        }
    }

    public MemberRole getMemberRole(UUID groupId, UUID userId) {
        return memberRepository.findByFamilyGroupIdAndUserId(groupId, userId)
                .map(FamilyGroupMember::getRole)
                .orElseThrow(() -> new UnauthorizedException("Você não é membro deste grupo"));
    }

    public void assertAdmin(UUID groupId, UUID userId) {
        assertRole(groupId, userId, MemberRole.ADMIN);
    }

    public void assertRole(UUID groupId, UUID userId, MemberRole minimumRole) {
        MemberRole role = getMemberRole(groupId, userId);
        if (!hasMinimumRole(role, minimumRole)) {
            throw new UnauthorizedException("Permissão insuficiente. Necessário: " + minimumRole);
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
