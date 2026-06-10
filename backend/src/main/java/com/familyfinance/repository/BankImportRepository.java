package com.familyfinance.repository;

import com.familyfinance.entity.BankImport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BankImportRepository extends JpaRepository<BankImport, UUID> {

    Page<BankImport> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId, Pageable pageable);
}
