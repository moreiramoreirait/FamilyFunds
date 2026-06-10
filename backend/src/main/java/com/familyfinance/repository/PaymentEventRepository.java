package com.familyfinance.repository;

import com.familyfinance.entity.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentEventRepository extends JpaRepository<PaymentEvent, UUID> {
    Optional<PaymentEvent> findByStripeEventId(String stripeEventId);
    boolean existsByStripeEventId(String stripeEventId);
}
