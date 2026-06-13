package com.familyfinance.repository;

import com.familyfinance.entity.Category;
import com.familyfinance.entity.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(UUID familyGroupId);
    List<Category> findByFamilyGroupIdAndTypeAndIsActiveTrueOrderByNameAsc(UUID familyGroupId, CategoryType type);
    boolean existsByFamilyGroupIdAndNameIgnoreCase(UUID familyGroupId, String name);
    Optional<Category> findFirstByFamilyGroupIdAndNameIgnoreCaseAndIsActiveTrue(UUID familyGroupId, String name);
}
