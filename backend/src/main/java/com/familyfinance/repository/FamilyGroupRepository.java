package com.familyfinance.repository;

import com.familyfinance.entity.FamilyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FamilyGroupRepository extends JpaRepository<FamilyGroup, UUID> {

    @Query("SELECT fg FROM FamilyGroup fg JOIN fg.members m WHERE m.user.id = :userId AND m.isActive = true")
    List<FamilyGroup> findByMemberUserId(UUID userId);
}
