package com.familyfinance.repository.spec;

import com.familyfinance.entity.Transaction;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Reusable, null-safe Specifications for filtering transactions.
 * Each optional factory returns {@code null} when its argument is null, so they
 * compose cleanly via {@code Specification.where(...).and(...)} (null clauses are skipped).
 */
public final class TransactionSpecifications {

    private TransactionSpecifications() {}

    /** Tenant isolation — ALWAYS applied. Never optional. */
    public static Specification<Transaction> inFamilyGroup(UUID familyGroupId) {
        return (root, query, cb) -> cb.equal(root.get("familyGroup").get("id"), familyGroupId);
    }

    public static Specification<Transaction> hasType(TransactionType type) {
        return type == null ? null : (root, query, cb) -> cb.equal(root.get("type"), type);
    }

    public static Specification<Transaction> hasStatus(TransactionStatus status) {
        return status == null ? null : (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Transaction> hasAccount(UUID accountId) {
        return accountId == null ? null
                : (root, query, cb) -> cb.equal(root.get("account").get("id"), accountId);
    }

    public static Specification<Transaction> hasCategory(UUID categoryId) {
        return categoryId == null ? null
                : (root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId);
    }

    /** Joins the transaction_tags relation; distinct avoids duplicate rows from the ManyToMany. */
    public static Specification<Transaction> hasTag(UUID tagId) {
        return tagId == null ? null : (root, query, cb) -> {
            query.distinct(true);
            return cb.equal(root.join("tags", JoinType.INNER).get("id"), tagId);
        };
    }

    public static Specification<Transaction> dateFrom(LocalDate start) {
        return start == null ? null
                : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("transactionDate"), start);
    }

    public static Specification<Transaction> dateTo(LocalDate end) {
        return end == null ? null
                : (root, query, cb) -> cb.lessThanOrEqualTo(root.get("transactionDate"), end);
    }
}
