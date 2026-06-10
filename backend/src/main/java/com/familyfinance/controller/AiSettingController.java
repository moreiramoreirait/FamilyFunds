package com.familyfinance.controller;

import com.familyfinance.dto.request.AiSettingRequest;
import com.familyfinance.dto.response.AiSettingResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.AiSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/ai-settings")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "AI Settings", description = "Configurações de inteligência artificial")
public class AiSettingController {

    private final AiSettingService aiSettingService;

    @GetMapping
    @Operation(summary = "Listar configurações de IA")
    public ResponseEntity<List<AiSettingResponse>> findAll(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(aiSettingService.findAll(groupId, currentUser));
    }

    @PostMapping
    @Operation(summary = "Salvar configuração de IA")
    public ResponseEntity<AiSettingResponse> save(
            @PathVariable UUID groupId,
            @Valid @RequestBody AiSettingRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(aiSettingService.save(groupId, request, currentUser));
    }

    @DeleteMapping("/{settingId}")
    @Operation(summary = "Remover configuração de IA")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId,
            @PathVariable UUID settingId,
            @AuthenticationPrincipal User currentUser) {
        aiSettingService.delete(groupId, settingId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/classify")
    @Operation(summary = "Classificar transação com IA")
    public ResponseEntity<Map<String, String>> classify(
            @PathVariable UUID groupId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String category = aiSettingService.classifyTransaction(groupId, body.get("description"), currentUser);
        return ResponseEntity.ok(Map.of("category", category));
    }
}
