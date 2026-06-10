package com.familyfinance.repository;

import com.familyfinance.entity.BankImportItem;
import com.familyfinance.entity.ImportItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BankImportItemRepository extends JpaRepository<BankImportItem, UUID> {

    List<BankImportItem> findByBankImportIdOrderByTransactionDateAsc(UUID bankImportId);

    List<BankImportItem> findByBankImportIdAndStatus(UUID bankImportId, ImportItemStatus status);

    long countByBankImportId(UUID bankImportId);
}
