package com.familyfinance.repository;

import com.familyfinance.entity.FamilyGroupInvite;
import com.familyfinance.entity.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyGroupInviteRepository extends JpaRepository<FamilyGroupInvite, UUID> {
    Optional<FamilyGroupInvite> findByToken(String token);
    List<FamilyGroupInvite> findByFamilyGroupIdAndStatus(UUID familyGroupId, InviteStatus status);
    Optional<FamilyGroupInvite> findByEmailAndFamilyGroupIdAndStatus(String email, UUID familyGroupId, InviteStatus status);
}
