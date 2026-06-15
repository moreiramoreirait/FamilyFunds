package com.familyfinance.service;

import com.familyfinance.entity.*;
import com.familyfinance.exception.UnauthorizedException;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final TransactionRepository transactionRepository;
    private final FamilyGroupMemberRepository memberRepository;

    private void assertMember(UUID groupId, UUID userId) {
        if (!memberRepository.existsByFamilyGroupIdAndUserIdAndIsActiveTrue(groupId, userId)) {
            throw new UnauthorizedException("You are not a member of this family group");
        }
    }

    public List<Notification> findUnread(UUID groupId, User currentUser) {
        assertMember(groupId, currentUser.getId());
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(
                currentUser.getId(), PageRequest.of(0, 50));
    }

    public List<Notification> findAll(UUID groupId, User currentUser) {
        assertMember(groupId, currentUser.getId());
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
                currentUser.getId(), PageRequest.of(0, 100));
    }

    public void markAsRead(UUID notificationId, User currentUser) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(currentUser.getId())) {
                n.setIsRead(true);
                n.setReadAt(java.time.LocalDateTime.now());
                notificationRepository.save(n);
            }
        });
    }

    public void markAllAsRead(UUID groupId, User currentUser) {
        assertMember(groupId, currentUser.getId());
        notificationRepository.markAllAsRead(currentUser.getId());
    }

    public long countUnread(User currentUser) {
        return notificationRepository.countByUserIdAndIsReadFalse(currentUser.getId());
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void checkOverdueTransactions() {
        LocalDate today = LocalDate.now();
        transactionRepository.findOverdueTransactions(today).forEach(tx -> {
            tx.setStatus(TransactionStatus.OVERDUE);
            transactionRepository.save(tx);
            notifyGroupMembers(
                    tx.getFamilyGroup(),
                    "Conta Vencida",
                    String.format("A conta '%s' venceu em %s", tx.getDescription(), tx.getDueDate()),
                    "OVERDUE"
            );
        });
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void checkDueSoonTransactions() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysLater = today.plusDays(3);
        transactionRepository.findDueSoonTransactions(today, threeDaysLater).forEach(tx ->
                notifyGroupMembers(
                        tx.getFamilyGroup(),
                        "Vencimento Próximo",
                        String.format("A conta '%s' vence em %s", tx.getDescription(), tx.getDueDate()),
                        "DUE_SOON"
                )
        );
    }

    private void notifyGroupMembers(FamilyGroup group, String title, String message, String type) {
        memberRepository.findByFamilyGroupIdAndIsActiveTrue(group.getId()).forEach(member -> {
            Notification notification = Notification.builder()
                    .familyGroup(group)
                    .user(member.getUser())
                    .type(type)
                    .title(title)
                    .message(message)
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
        });
    }

    /**
     * Notifica os demais membros ativos do grupo sobre uma ação feita por um membro.
     * Assíncrono e tolerante a falha — nunca quebra o fluxo principal (igual ao e-mail).
     * O autor da ação (actorUserId) não é notificado.
     */
    @Async
    public void notifyMembersOfAction(UUID groupId, UUID actorUserId, String title, String message, String type) {
        try {
            FamilyGroup group = new FamilyGroup();
            group.setId(groupId);
            memberRepository.findByFamilyGroupIdAndIsActiveTrue(groupId).forEach(member -> {
                if (actorUserId != null && member.getUser().getId().equals(actorUserId)) return;
                notificationRepository.save(Notification.builder()
                        .familyGroup(group)
                        .user(member.getUser())
                        .type(type)
                        .title(title)
                        .message(message)
                        .isRead(false)
                        .build());
            });
        } catch (Exception e) {
            log.error("Falha ao notificar membros do grupo {} (ação {})", groupId, type, e);
        }
    }

    public void createNotification(FamilyGroup group, User user, String title, String message, String type) {
        Notification notification = Notification.builder()
                .familyGroup(group)
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }
}
