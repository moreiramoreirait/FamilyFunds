package com.familyfinance.repository;

import com.familyfinance.entity.RecurringExpense;
import com.familyfinance.entity.RecurringExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RecurringExpenseRepository extends JpaRepository<RecurringExpense, UUID> {

    List<RecurringExpense> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId);

    List<RecurringExpense> findByFamilyGroupIdAndStatus(UUID familyGroupId, RecurringExpenseStatus status);

    List<RecurringExpense> findByStatus(RecurringExpenseStatus status);
}
