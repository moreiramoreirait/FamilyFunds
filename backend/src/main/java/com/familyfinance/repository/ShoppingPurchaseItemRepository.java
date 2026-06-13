package com.familyfinance.repository;

import com.familyfinance.entity.ShoppingPurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ShoppingPurchaseItemRepository extends JpaRepository<ShoppingPurchaseItem, UUID> {
}
