package com.familyfinance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shopping_list_items")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ShoppingListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shopping_list_id", nullable = false)
    private ShoppingList shoppingList;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "normalized_product_name", length = 200)
    private String normalizedProductName;

    @Column(length = 120)
    private String category;

    @Column(precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(length = 20)
    private String unit;

    @Column(name = "estimated_unit_price", precision = 15, scale = 4)
    private BigDecimal estimatedUnitPrice;

    @Column(name = "estimated_total_price", precision = 15, scale = 2)
    private BigDecimal estimatedTotalPrice;

    @Column(name = "last_paid_price", precision = 15, scale = 4)
    private BigDecimal lastPaidPrice;

    @Column(name = "preferred_store", length = 160)
    private String preferredStore;

    @Column(nullable = false)
    @Builder.Default
    private Boolean checked = false;

    @Column(name = "real_unit_price", precision = 15, scale = 4)
    private BigDecimal realUnitPrice;

    @Column(name = "real_total_price", precision = 15, scale = 2)
    private BigDecimal realTotalPrice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
