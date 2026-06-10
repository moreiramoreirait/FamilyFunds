package com.familyfinance.repository;

import com.familyfinance.entity.CostCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CostCenterRepository extends JpaRepository<CostCenter, UUID> {
    List<CostCenter> findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(UUID familyGroupId);
    boolean existsByFamilyGroupIdAndNameIgnoreCase(UUID familyGroupId, String name);
}
