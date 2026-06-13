package com.familyfinance.repository;

import com.familyfinance.entity.ProductPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductPriceHistoryRepository extends JpaRepository<ProductPriceHistory, UUID> {

    @Modifying
    @Transactional
    void deleteByPurchaseId(UUID purchaseId);

    long countDistinctNormalizedProductNameByFamilyGroupId(UUID familyGroupId);

    /** Todos os registros de um produto (do mais recente p/ o mais antigo) — usado no detalhe. */
    List<ProductPriceHistory> findByFamilyGroupIdAndNormalizedProductNameOrderByPurchaseDateDescCreatedAtDesc(
            UUID familyGroupId, String normalizedProductName);

    /**
     * Resumo por produto para a listagem: [normalizedName, nomeRepresentativo,
     * minPreço, maxPreço, últimaData, qtdRegistros].
     */
    @Query("SELECT h.normalizedProductName, MIN(h.productName), MIN(h.unitPrice), MAX(h.unitPrice), " +
           "MAX(h.purchaseDate), COUNT(h) FROM ProductPriceHistory h " +
           "WHERE h.familyGroup.id = :groupId " +
           "GROUP BY h.normalizedProductName ORDER BY MAX(h.purchaseDate) DESC")
    List<Object[]> summarizeByGroup(UUID groupId);

    /** Produtos mais comprados (por nº de registros) — base para insights. */
    @Query("SELECT h.normalizedProductName, MIN(h.productName), COUNT(h) FROM ProductPriceHistory h " +
           "WHERE h.familyGroup.id = :groupId GROUP BY h.normalizedProductName ORDER BY COUNT(h) DESC")
    List<Object[]> mostPurchased(UUID groupId);
}
