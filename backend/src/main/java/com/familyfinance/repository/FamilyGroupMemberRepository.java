package com.familyfinance.repository;

import com.familyfinance.entity.FamilyGroupMember;
import com.familyfinance.entity.MemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyGroupMemberRepository extends JpaRepository<FamilyGroupMember, UUID> {
    Optional<FamilyGroupMember> findByFamilyGroupIdAndUserId(UUID familyGroupId, UUID userId);
    List<FamilyGroupMember> findByFamilyGroupIdAndIsActiveTrue(UUID familyGroupId);
    boolean existsByFamilyGroupIdAndUserIdAndIsActiveTrue(UUID familyGroupId, UUID userId);
    Optional<FamilyGroupMember> findByFamilyGroupIdAndUserIdAndRole(UUID familyGroupId, UUID userId, MemberRole role);
    long countByFamilyGroupIdAndIsActiveTrue(UUID familyGroupId);
}
