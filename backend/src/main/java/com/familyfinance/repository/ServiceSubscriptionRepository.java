package com.familyfinance.repository;

import com.familyfinance.entity.ServiceSubscription;
import com.familyfinance.entity.ServiceSubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceSubscriptionRepository extends JpaRepository<ServiceSubscription, UUID> {

    List<ServiceSubscription> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId);

    List<ServiceSubscription> findByFamilyGroupIdAndStatus(UUID familyGroupId, ServiceSubscriptionStatus status);

    List<ServiceSubscription> findByStatus(ServiceSubscriptionStatus status);
}
