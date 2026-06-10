package com.familyfinance.repository;

import com.familyfinance.entity.AiProvider;
import com.familyfinance.entity.AiSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiSettingRepository extends JpaRepository<AiSetting, UUID> {
    List<AiSetting> findByFamilyGroupId(UUID familyGroupId);
    Optional<AiSetting> findByFamilyGroupIdAndProvider(UUID familyGroupId, AiProvider provider);
}
