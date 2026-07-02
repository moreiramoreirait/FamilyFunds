package com.familyfinance.repository;

import com.familyfinance.entity.CategorizationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategorizationRuleRepository extends JpaRepository<CategorizationRule, UUID> {
    List<CategorizationRule> findByFamilyGroupId(UUID familyGroupId);
    Optional<CategorizationRule> findByFamilyGroupIdAndKeyword(UUID familyGroupId, String keyword);
}
