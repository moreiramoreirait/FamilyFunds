package com.familyfinance.repository;

import com.familyfinance.entity.ShoppingPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ShoppingPurchaseRepository extends JpaRepository<ShoppingPurchase, UUID> {

    List<ShoppingPurchase> findByFamilyGroupIdOrderByPurchaseDateDescCreatedAtDesc(UUID familyGroupId);

    long countByFamilyGroupIdAndPurchaseDateBetween(UUID familyGroupId, LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM ShoppingPurchase p " +
           "WHERE p.familyGroup.id = :groupId AND p.status <> 'CANCELADA' " +
           "AND p.purchaseDate BETWEEN :start AND :end")
    BigDecimal sumTotalByPeriod(UUID groupId, LocalDate start, LocalDate end);
}
