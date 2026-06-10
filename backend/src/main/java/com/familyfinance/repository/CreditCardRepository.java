package com.familyfinance.repository;

import com.familyfinance.entity.CreditCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CreditCardRepository extends JpaRepository<CreditCard, UUID> {
    List<CreditCard> findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(UUID familyGroupId);
}
