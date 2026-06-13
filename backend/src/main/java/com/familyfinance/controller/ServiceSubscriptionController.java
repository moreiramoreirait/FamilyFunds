package com.familyfinance.controller;

import com.familyfinance.dto.request.ServiceSubscriptionRequest;
import com.familyfinance.dto.response.ServiceSubscriptionResponse;
import com.familyfinance.dto.response.ServiceSubscriptionSummaryResponse;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.ServiceSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/service-subscriptions")
@RequiredArgsConstructor
@Tag(name = "Service Subscriptions", description = "Assinaturas de serviços (Netflix, Spotify, ...)")
@SecurityRequirement(name = "bearerAuth")
public class ServiceSubscriptionController {

    private final ServiceSubscriptionService service;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    @Operation(summary = "Listar assinaturas")
    public ResponseEntity<List<ServiceSubscriptionResponse>> list(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.list(groupId));
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumo das assinaturas (total mensal, próxima cobrança)")
    public ResponseEntity<ServiceSubscriptionSummaryResponse> summary(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getSummary(groupId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalhes da assinatura")
    public ResponseEntity<ServiceSubscriptionResponse> get(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getById(groupId, id));
    }

    @PostMapping
    @Operation(summary = "Criar assinatura")
    public ResponseEntity<ServiceSubscriptionResponse> create(
            @PathVariable UUID groupId, @Valid @RequestBody ServiceSubscriptionRequest req,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(groupId, req, user));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar assinatura")
    public ResponseEntity<ServiceSubscriptionResponse> update(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @Valid @RequestBody ServiceSubscriptionRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.update(groupId, id, req));
    }

    @PatchMapping("/{id}/pause")
    @Operation(summary = "Pausar assinatura")
    public ResponseEntity<ServiceSubscriptionResponse> pause(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.pause(groupId, id));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancelar assinatura")
    public ResponseEntity<ServiceSubscriptionResponse> cancel(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.cancel(groupId, id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Reativar assinatura")
    public ResponseEntity<ServiceSubscriptionResponse> activate(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.activate(groupId, id));
    }

    @PostMapping("/generate")
    @Operation(summary = "Gerar lançamentos das assinaturas (manual)")
    public ResponseEntity<java.util.Map<String, Integer>> generate(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        int created = service.generateCharges(groupId);
        return ResponseEntity.ok(java.util.Map.of("created", created));
    }
}
