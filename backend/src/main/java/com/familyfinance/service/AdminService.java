package com.familyfinance.service;

import com.familyfinance.dto.response.AdminGroupResponse;
import com.familyfinance.dto.response.AdminStatsResponse;
import com.familyfinance.dto.response.SubscriptionResponse;
import com.familyfinance.entity.*;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final FamilyGroupRepository familyGroupRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final FamilyGroupMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    public List<AdminGroupResponse> listAllGroups() {
        return familyGroupRepository.findAll().stream()
                .map(group -> {
                    Subscription sub = subscriptionRepository.findByFamilyGroupId(group.getId())
                            .orElse(null);
                    long memberCount = memberRepository.countByFamilyGroupIdAndIsActiveTrue(group.getId());
                    String ownerEmail = group.getCreatedBy() != null ? group.getCreatedBy().getEmail() : "";
                    String ownerName = group.getCreatedBy() != null ? group.getCreatedBy().getName() : "";
                    PlanType plan = sub != null ? sub.getPlan() : PlanType.FREE;
                    PlanType eff = sub != null ? sub.getEffectivePlan() : PlanType.FREE;
                    SubscriptionStatus status = sub != null ? sub.getStatus() : SubscriptionStatus.ACTIVE;
                    return new AdminGroupResponse(
                            group.getId(), group.getName(), ownerEmail, ownerName,
                            (int) memberCount, plan, eff, status,
                            sub != null ? sub.getTrialEndDate() : null,
                            group.getCreatedAt());
                })
                .toList();
    }

    public AdminStatsResponse getStats() {
        long total = familyGroupRepository.count();
        List<Subscription> subs = subscriptionRepository.findAll();
        long trial = subs.stream().filter(s -> s.getStatus() == SubscriptionStatus.TRIAL).count();
        long activePro = subs.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE && s.getPlan() == PlanType.ESSENCIAL).count();
        long activeBiz = subs.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE && s.getPlan() == PlanType.PREMIUM).count();
        long expired = subs.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.EXPIRED || s.getStatus() == SubscriptionStatus.CANCELLED).count();
        long free = total - trial - activePro - activeBiz - expired;
        long totalUsers = userRepository.count();
        double mrr = activePro * PlanType.ESSENCIAL.getPriceMonthly() + activeBiz * PlanType.PREMIUM.getPriceMonthly();
        return new AdminStatsResponse(total, trial, activePro, activeBiz, Math.max(free, 0), expired, totalUsers, mrr);
    }

    @Transactional
    public SubscriptionResponse forceChangePlan(UUID groupId, PlanType newPlan) {
        return subscriptionService.upgradePlan(groupId, newPlan);
    }
}
