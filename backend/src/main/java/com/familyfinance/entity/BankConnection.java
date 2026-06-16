package com.familyfinance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/** Conexão bancária via Open Finance (agregador Pluggy). Guarda só a referência ao "item". */
@Entity
@Table(name = "bank_connections")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BankConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "pluggy_item_id", nullable = false, length = 100)
    private String pluggyItemId;

    @Column(name = "connector_name", length = 150)
    private String connectorName;

    @Column(name = "connector_image_url", length = 500)
    private String connectorImageUrl;

    @Column(name = "status", nullable = false, length = 40)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "status_detail", length = 255)
    private String statusDetail;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
