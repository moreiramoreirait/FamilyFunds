package com.familyfinance.repository;

import com.familyfinance.entity.ShoppingList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShoppingListRepository extends JpaRepository<ShoppingList, UUID> {
    List<ShoppingList> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId);
}
