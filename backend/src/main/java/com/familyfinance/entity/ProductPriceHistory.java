package com.familyfinance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** Registro histórico de preço de um produto (alimentado a cada item de compra). */
@Entity
@Table(name = "product_price_history")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProductPriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "normalized_product_name", nullable = false, length = 200)
    private String normalizedProductName;

    @Column(name = "store_name", length = 160)
    private String storeName;

    @Column(name = "store_cnpj", length = 20)
    private String storeCnpj;

    @Column(name = "unit_price", precision = 15, scale = 4)
    private BigDecimal unitPrice;

    @Column(precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(length = 20)
    private String unit;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_id")
    private UUID purchaseId;

    @Column(name = "purchase_item_id")
    private UUID purchaseItemId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
