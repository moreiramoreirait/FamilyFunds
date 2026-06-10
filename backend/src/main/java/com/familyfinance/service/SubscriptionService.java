package com.familyfinance.service;

import com.familyfinance.dto.response.PlanResponse;
import com.familyfinance.dto.response.SubscriptionResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final AccountRepository accountRepository;
    private final CreditCardRepository creditCardRepository;
    private final FamilyGroupMemberRepository memberRepository;
    private final TransactionRepository transactionRepository;
    private final BankImportRepository bankImportRepository;

    @Transactional
    public Subscription createTrialSubscription(FamilyGroup group) {
        Subscription sub = Subscription.builder()
                .familyGroup(group)
                .plan(PlanType.FREE)
                .status(SubscriptionStatus.TRIAL)
                .trialEndDate(LocalDateTime.now().plusDays(14))
                .currentPeriodStart(LocalDateTime.now())
                .build();
        return subscriptionRepository.save(sub);
    }

    public SubscriptionResponse getSubscription(UUID familyGroupId) {
        Subscription sub = findOrDefault(familyGroupId);
        return toResponse(sub);
    }

    @Transactional
    public SubscriptionResponse upgradePlan(UUID familyGroupId, PlanType newPlan) {
        Subscription sub = findOrDefault(familyGroupId);
        sub.setPlan(newPlan);
        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setCurrentPeriodStart(LocalDateTime.now());
        sub.setCurrentPeriodEnd(LocalDateTime.now().plusMonths(1));
        sub.setTrialEndDate(null);
        return toResponse(subscriptionRepository.save(sub));
    }

    @Transactional
    public SubscriptionResponse cancelSubscription(UUID familyGroupId) {
        Subscription sub = findOrDefault(familyGroupId);
        sub.setStatus(SubscriptionStatus.CANCELLED);
        sub.setCancelledAt(LocalDateTime.now());
        return toResponse(subscriptionRepository.save(sub));
    }

    // ─── Limit Checks ────────────────────────────────────────────────────────

    public void checkAccountLimit(UUID familyGroupId) {
        PlanType plan = getEffectivePlan(familyGroupId);
        if (plan.getMaxAccounts() == -1) return;
        long count = accountRepository.countByFamilyGroupIdAndIsActiveTrue(familyGroupId);
        if (count >= plan.getMaxAccounts()) {
            throw new BusinessException(String.format(
                "Limite de %d conta(s) atingido para o plano %s. Faça upgrade para continuar.",
                plan.getMaxAccounts(), plan.getDisplayName()));
        }
    }

    public void checkCreditCardLimit(UUID familyGroupId) {
        PlanType plan = getEffectivePlan(familyGroupId);
        if (plan.getMaxCreditCards() == -1) return;
        long count = creditCardRepository.countByFamilyGroupIdAndIsActiveTrue(familyGroupId);
        if (count >= plan.getMaxCreditCards()) {
            throw new BusinessException(String.format(
                "Limite de %d cartão(ões) atingido para o plano %s. Faça upgrade para continuar.",
                plan.getMaxCreditCards(), plan.getDisplayName()));
        }
    }

    public void checkMemberLimit(UUID familyGroupId) {
        PlanType plan = getEffectivePlan(familyGroupId);
        if (plan.getMaxUsers() == -1) return;
        long count = memberRepository.countByFamilyGroupIdAndIsActiveTrue(familyGroupId);
        if (count >= plan.getMaxUsers()) {
            throw new BusinessException(String.format(
                "Limite de %d usuário(s) atingido para o plano %s. Faça upgrade para continuar.",
                plan.getMaxUsers(), plan.getDisplayName()));
        }
    }

    public void checkTransactionLimit(UUID familyGroupId) {
        PlanType plan = getEffectivePlan(familyGroupId);
        if (plan.getMaxTransactionsPerMonth() == -1) return;
        YearMonth current = YearMonth.now();
        LocalDateTime start = current.atDay(1).atStartOfDay();
        LocalDateTime end = current.atEndOfMonth().atTime(23, 59, 59);
        long count = transactionRepository.countByFamilyGroupIdAndCreatedAtBetween(familyGroupId, start, end);
        if (count >= plan.getMaxTransactionsPerMonth()) {
            throw new BusinessException(String.format(
                "Limite de %d lançamento(s)/mês atingido para o plano %s. Faça upgrade para continuar.",
                plan.getMaxTransactionsPerMonth(), plan.getDisplayName()));
        }
    }

    public void checkImportLimit(UUID familyGroupId) {
        PlanType plan = getEffectivePlan(familyGroupId);
        if (plan.getMaxImportsPerMonth() == -1) return;
        if (plan.getMaxImportsPerMonth() == 0) {
            throw new BusinessException(
                "Importação de extratos não está disponível no plano " + plan.getDisplayName() +
                ". Faça upgrade para o plano Pro ou superior.");
        }
        YearMonth current = YearMonth.now();
        LocalDateTime start = current.atDay(1).atStartOfDay();
        LocalDateTime end = current.atEndOfMonth().atTime(23, 59, 59);
        long count = bankImportRepository.countByFamilyGroupIdAndCreatedAtBetween(familyGroupId, start, end);
        if (count >= plan.getMaxImportsPerMonth()) {
            throw new BusinessException(String.format(
                "Limite de %d importação(ões)/mês atingido para o plano %s.",
                plan.getMaxImportsPerMonth(), plan.getDisplayName()));
        }
    }

    public void checkAiAccess(UUID familyGroupId) {
        PlanType plan = getEffectivePlan(familyGroupId);
        if (!plan.isAiEnabled()) {
            throw new BusinessException(
                "Integração com IA não está disponível no plano " + plan.getDisplayName() +
                ". Faça upgrade para o plano Pro ou superior.");
        }
    }

    // ─── Scheduled: expire trials ─────────────────────────────────────────────

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void expireTrials() {
        List<Subscription> trials = subscriptionRepository.findByStatus(SubscriptionStatus.TRIAL);
        LocalDateTime now = LocalDateTime.now();
        for (Subscription sub : trials) {
            if (sub.getTrialEndDate() != null && now.isAfter(sub.getTrialEndDate())) {
                sub.setStatus(SubscriptionStatus.EXPIRED);
                subscriptionRepository.save(sub);
            }
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public PlanType getEffectivePlan(UUID familyGroupId) {
        return findOrDefault(familyGroupId).getEffectivePlan();
    }

    private Subscription findOrDefault(UUID familyGroupId) {
        return subscriptionRepository.findByFamilyGroupId(familyGroupId)
                .orElseGet(() -> {
                    FamilyGroup group = new FamilyGroup();
                    group.setId(familyGroupId);
                    return Subscription.builder()
                            .familyGroup(group)
                            .plan(PlanType.FREE)
                            .status(SubscriptionStatus.ACTIVE)
                            .build();
                });
    }

    public List<PlanResponse> listPlans() {
        return Arrays.stream(PlanType.values())
                .map(p -> new PlanResponse(
                        p, p.getDisplayName(), p.getPriceMonthly(),
                        p.getMaxUsers(), p.getMaxAccounts(), p.getMaxCreditCards(),
                        p.getMaxTransactionsPerMonth(), p.getMaxImportsPerMonth(),
                        p.isAiEnabled(), p.isAdvancedReports(),
                        getPlanFeatures(p)))
                .toList();
    }

    private List<String> getPlanFeatures(PlanType p) {
        return switch (p) {
            case FREE -> List.of("2 usuários", "3 contas bancárias", "1 cartão de crédito",
                    "50 lançamentos/mês", "Categorias e orçamentos", "Dashboard básico");
            case PRO -> List.of("10 usuários", "15 contas bancárias", "5 cartões de crédito",
                    "1.000 lançamentos/mês", "10 importações de extrato/mês",
                    "Integração com IA", "Relatórios avançados", "Suporte prioritário");
            case BUSINESS -> List.of("Usuários ilimitados", "Contas ilimitadas", "Cartões ilimitados",
                    "Lançamentos ilimitados", "Importações ilimitadas",
                    "Integração com IA", "Relatórios avançados", "API Access", "Suporte dedicado");
        };
    }

    private SubscriptionResponse toResponse(Subscription sub) {
        PlanType eff = sub.getEffectivePlan();
        return new SubscriptionResponse(
                sub.getId(), sub.getFamilyGroup().getId(),
                sub.getPlan(), eff, sub.getStatus(),
                sub.getTrialEndDate(), sub.getTrialDaysLeft(), sub.isTrialActive(),
                sub.getCurrentPeriodEnd(),
                eff.getMaxUsers(), eff.getMaxAccounts(), eff.getMaxCreditCards(),
                eff.getMaxTransactionsPerMonth(), eff.getMaxImportsPerMonth(),
                eff.isAiEnabled(), eff.isAdvancedReports(),
                eff.getDisplayName(), eff.getPriceMonthly()
        );
    }
}
