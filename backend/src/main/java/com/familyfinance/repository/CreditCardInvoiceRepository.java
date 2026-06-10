package com.familyfinance.repository;

import com.familyfinance.entity.CreditCardInvoice;
import com.familyfinance.entity.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreditCardInvoiceRepository extends JpaRepository<CreditCardInvoice, UUID> {
    List<CreditCardInvoice> findByCreditCardIdOrderByReferenceYearDescReferenceMonthDesc(UUID creditCardId);
    Optional<CreditCardInvoice> findByCreditCardIdAndReferenceMonthAndReferenceYear(UUID cardId, int month, int year);
    List<CreditCardInvoice> findByFamilyGroupIdAndStatus(UUID familyGroupId, InvoiceStatus status);

    @Query("SELECT COALESCE(SUM(i.totalAmount - i.paidAmount), 0) FROM CreditCardInvoice i WHERE i.familyGroup.id = :groupId AND i.status IN ('OPEN','CLOSED','OVERDUE')")
    java.math.BigDecimal sumOutstandingByFamilyGroup(UUID groupId);
}
