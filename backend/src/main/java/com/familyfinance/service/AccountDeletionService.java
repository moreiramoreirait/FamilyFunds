package com.familyfinance.service;

import com.familyfinance.entity.FamilyGroupMember;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.User;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.exception.UnauthorizedException;
import com.familyfinance.repository.FamilyGroupMemberRepository;
import com.familyfinance.repository.FamilyGroupRepository;
import com.familyfinance.repository.SubscriptionRepository;
import com.familyfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Exclusão da própria conta (LGPD). Anonimiza o usuário e trata suas famílias:
 * famílias só dele são apagadas (cascata limpa todos os dados); nas compartilhadas
 * o vínculo é removido e, se necessário, outro membro é promovido a administrador.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyGroupMemberRepository memberRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final StripeService stripeService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void deleteOwnAccount(User currentUser, String password) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        if (password == null || user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new UnauthorizedException("Senha incorreta");
        }

        UUID userId = user.getId();
        for (FamilyGroupMember membership : memberRepository.findByUserIdAndIsActiveTrue(userId)) {
            UUID groupId = membership.getFamilyGroup().getId();
            List<FamilyGroupMember> active = memberRepository.findByFamilyGroupIdAndIsActiveTrue(groupId);
            List<FamilyGroupMember> others = active.stream()
                    .filter(m -> !m.getUser().getId().equals(userId))
                    .toList();

            if (others.isEmpty()) {
                // Cancela a assinatura no Stripe (best-effort) antes de apagar a família
                subscriptionRepository.findByFamilyGroupId(groupId)
                        .ifPresent(sub -> stripeService.cancelSubscriptionOnStripe(sub.getStripeSubscriptionId()));
                // Só ele no grupo → apaga a família (cascata remove contas, lançamentos, etc.)
                familyGroupRepository.deleteById(groupId);
            } else {
                // Compartilhada: garante que sobre um admin
                boolean otherAdmin = others.stream().anyMatch(m -> m.getRole() == MemberRole.ADMIN);
                if (membership.getRole() == MemberRole.ADMIN && !otherAdmin) {
                    others.stream()
                            .min(Comparator.comparing(FamilyGroupMember::getJoinedAt,
                                    Comparator.nullsLast(Comparator.naturalOrder())))
                            .ifPresent(m -> { m.setRole(MemberRole.ADMIN); memberRepository.save(m); });
                }
                membership.setIsActive(false);
                memberRepository.save(membership);
            }
        }

        // Anonimiza o usuário (LGPD): remove dados pessoais, mantém integridade referencial
        user.setName("Usuário excluído");
        user.setEmail("deleted-" + userId.toString().substring(0, 8) + "@familyfunds.local");
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setPhone(null);
        user.setAvatarUrl(null);
        user.setIsActive(false);
        userRepository.save(user);

        log.info("Conta excluída/anonimizada: {}", userId);
    }
}
