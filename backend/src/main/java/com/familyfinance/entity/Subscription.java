package com.familyfinance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false, unique = true)
    private FamilyGroup familyGroup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlanType plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    private LocalDateTime trialEndDate;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private LocalDateTime cancelledAt;

    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Column(name = "payment_pending", nullable = false)
    @Builder.Default
    private boolean paymentPending = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() { this.createdAt = LocalDateTime.now(); }

    public PlanType getEffectivePlan() {
        if (status == SubscriptionStatus.TRIAL) return PlanType.PREMIUM;
        if (status == SubscriptionStatus.ACTIVE) return plan;
        return PlanType.FREE; // CANCELLED or EXPIRED
    }

    public boolean isTrialActive() {
        return status == SubscriptionStatus.TRIAL &&
               trialEndDate != null &&
               LocalDateTime.now().isBefore(trialEndDate);
    }

    public long getTrialDaysLeft() {
        if (!isTrialActive()) return 0;
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDateTime.now(), trialEndDate);
    }
}
