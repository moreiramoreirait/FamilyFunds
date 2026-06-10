package com.familyfinance.repository;

import com.familyfinance.entity.Subscription;
import com.familyfinance.entity.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByFamilyGroupId(UUID familyGroupId);
    List<Subscription> findByStatus(SubscriptionStatus status);
}
