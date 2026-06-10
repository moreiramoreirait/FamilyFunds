package com.familyfinance.repository;

import com.familyfinance.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findByFamilyGroupIdAndMonthAndYear(UUID familyGroupId, int month, int year);
    Optional<Budget> findByFamilyGroupIdAndCategoryIdAndMonthAndYear(UUID familyGroupId, UUID categoryId, int month, int year);
    Optional<Budget> findByFamilyGroupIdAndCostCenterIdAndMonthAndYear(UUID familyGroupId, UUID costCenterId, int month, int year);
}
