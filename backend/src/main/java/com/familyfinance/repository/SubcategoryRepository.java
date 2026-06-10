package com.familyfinance.repository;

import com.familyfinance.entity.Subcategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubcategoryRepository extends JpaRepository<Subcategory, UUID> {
    List<Subcategory> findByCategoryIdAndIsActiveTrueOrderByNameAsc(UUID categoryId);
    List<Subcategory> findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(UUID familyGroupId);
}
