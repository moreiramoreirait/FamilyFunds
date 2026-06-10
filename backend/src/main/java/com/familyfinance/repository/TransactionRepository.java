package com.familyfinance.repository;

import com.familyfinance.entity.Transaction;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

    Page<Transaction> findByFamilyGroupIdOrderByTransactionDateDesc(UUID familyGroupId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.familyGroup.id = :groupId AND t.type = :type AND t.status != 'CANCELLED' AND t.transactionDate BETWEEN :start AND :end")
    BigDecimal sumByTypeAndPeriod(UUID groupId, TransactionType type, LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.familyGroup.id = :groupId AND t.type = :type AND t.status = :status AND t.transactionDate BETWEEN :start AND :end")
    BigDecimal sumByTypeStatusAndPeriod(UUID groupId, TransactionType type, TransactionStatus status, LocalDate start, LocalDate end);

    List<Transaction> findByFamilyGroupIdAndStatusAndDueDateBefore(UUID groupId, TransactionStatus status, LocalDate date);

    @Query("SELECT t FROM Transaction t WHERE t.familyGroup.id = :groupId ORDER BY t.createdAt DESC")
    List<Transaction> findRecentByFamilyGroupId(UUID groupId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.familyGroup.id = :groupId AND t.dueDate BETWEEN :start AND :end AND t.status = 'PENDING' ORDER BY t.dueDate ASC")
    List<Transaction> findUpcomingDue(UUID groupId, LocalDate start, LocalDate end);

    @Query("SELECT t.category.id, t.category.name, SUM(t.amount) FROM Transaction t WHERE t.familyGroup.id = :groupId AND t.type = 'EXPENSE' AND t.status != 'CANCELLED' AND t.transactionDate BETWEEN :start AND :end GROUP BY t.category.id, t.category.name ORDER BY SUM(t.amount) DESC")
    List<Object[]> sumExpensesByCategory(UUID groupId, LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.familyGroup.id = :groupId " +
           "AND t.type = :type AND t.category.id = :categoryId AND t.status != 'CANCELLED' " +
           "AND t.transactionDate BETWEEN :start AND :end")
    BigDecimal sumByTypeAndCategoryAndPeriod(UUID groupId, TransactionType type, UUID categoryId,
                                             LocalDate start, LocalDate end);

    @Query("SELECT t FROM Transaction t WHERE t.familyGroup.id = :groupId " +
           "AND t.status = 'PENDING' AND t.dueDate < :today")
    List<Transaction> findOverdueTransactions(LocalDate today);

    @Query("SELECT t FROM Transaction t WHERE t.familyGroup.id IS NOT NULL " +
           "AND t.status = 'PENDING' AND t.dueDate BETWEEN :start AND :end")
    List<Transaction> findDueSoonTransactions(LocalDate start, LocalDate end);

    long countByFamilyGroupIdAndCreatedAtBetween(UUID familyGroupId, LocalDateTime start, LocalDateTime end);

    @Query(value = "SELECT DATE_TRUNC('month', t.transaction_date) as month, " +
            "SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as income, " +
            "SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as expense " +
            "FROM transactions t WHERE t.family_group_id = :groupId " +
            "AND t.transaction_date >= :start AND t.status != 'CANCELLED' " +
            "GROUP BY DATE_TRUNC('month', t.transaction_date) ORDER BY month",
            nativeQuery = true)
    List<Object[]> getMonthlyEvolution(UUID groupId, LocalDate start);
}
