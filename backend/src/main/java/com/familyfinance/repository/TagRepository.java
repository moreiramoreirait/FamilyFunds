package com.familyfinance.repository;

import com.familyfinance.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(UUID familyGroupId);
    Optional<Tag> findByFamilyGroupIdAndNameIgnoreCase(UUID familyGroupId, String name);
    boolean existsByFamilyGroupIdAndNameIgnoreCase(UUID familyGroupId, String name);
}
