package com.familyfinance.repository;

import com.familyfinance.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {
    List<Account> findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(UUID familyGroupId);
    List<Account> findByFamilyGroupId(UUID familyGroupId);

    @Query("SELECT COALESCE(SUM(a.currentBalance), 0) FROM Account a WHERE a.familyGroup.id = :familyGroupId AND a.isActive = true AND a.includeInTotal = true")
    BigDecimal sumBalanceByFamilyGroupId(UUID familyGroupId);
}
