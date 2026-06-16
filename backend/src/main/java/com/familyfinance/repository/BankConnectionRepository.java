package com.familyfinance.repository;

import com.familyfinance.entity.BankConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankConnectionRepository extends JpaRepository<BankConnection, UUID> {
    List<BankConnection> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId);
    Optional<BankConnection> findByPluggyItemId(String pluggyItemId);
}
