package com.familyfinance.service;

import com.familyfinance.dto.request.AiSettingRequest;
import com.familyfinance.dto.response.AiSettingResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.AiSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AiSettingService {

    private final AiSettingRepository aiSettingRepository;
    private final FamilyGroupService familyGroupService;
    private final EncryptionService encryptionService;

    public List<AiSettingResponse> findAll(UUID groupId, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        return aiSettingRepository.findByFamilyGroupId(groupId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public AiSettingResponse save(UUID groupId, AiSettingRequest req, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        FamilyGroup group = new FamilyGroup();
        group.setId(groupId);

        // Check if provider already exists for this group
        AiSetting setting = aiSettingRepository.findByFamilyGroupIdAndProvider(groupId, req.provider())
                .orElse(AiSetting.builder()
                        .familyGroup(group)
                        .provider(req.provider())
                        .build());

        String encryptedKey = encryptionService.encrypt(req.apiKey());
        setting.setApiKeyEncrypted(encryptedKey);
        setting.setModel(req.model());
        setting.setIsActive(req.isActive() != null ? req.isActive() : true);

        return toResponse(aiSettingRepository.save(setting));
    }

    public void delete(UUID groupId, UUID settingId, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.ADMIN);
        AiSetting setting = aiSettingRepository.findById(settingId)
                .filter(s -> s.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Configuração não encontrada"));
        aiSettingRepository.delete(setting);
    }

    public String classifyTransaction(UUID groupId, String description, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        // Find first active AI setting
        return aiSettingRepository.findByFamilyGroupId(groupId).stream()
                .filter(AiSetting::getIsActive)
                .findFirst()
                .map(setting -> {
                    try {
                        String apiKey = encryptionService.decrypt(setting.getApiKeyEncrypted());
                        return callAiProvider(setting.getProvider(), setting.getModel(), apiKey, description);
                    } catch (Exception e) {
                        return "Outros";
                    }
                })
                .orElse("Outros");
    }

    private String callAiProvider(AiProvider provider, String model, String apiKey, String description) {
        // Simplified AI call - in production would use proper HTTP client
        // Returns suggested category name
        return "Outros"; // Placeholder
    }

    private AiSettingResponse toResponse(AiSetting s) {
        return new AiSettingResponse(
                s.getId(),
                s.getProvider(),
                s.getModel(),
                s.getIsActive(),
                s.getApiKeyEncrypted() != null ? "••••••••" : null
        );
    }
}
