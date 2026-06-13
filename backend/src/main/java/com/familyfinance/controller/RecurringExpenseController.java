package com.familyfinance.controller;

import com.familyfinance.dto.request.RecurringExpenseRequest;
import com.familyfinance.dto.response.RecurringExpenseResponse;
import com.familyfinance.dto.response.RecurringExpenseSummaryResponse;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.RecurringExpenseService;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/recurring-expenses")
@RequiredArgsConstructor
@Tag(name = "Recurring Expenses", description = "Despesas recorrentes (aluguel, internet, ...)")
@SecurityRequirement(name = "bearerAuth")
public class RecurringExpenseController {

    private final RecurringExpenseService service;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    @Operation(summary = "Listar despesas recorrentes")
    public ResponseEntity<List<RecurringExpenseResponse>> list(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.list(groupId));
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumo das despesas recorrentes")
    public ResponseEntity<RecurringExpenseSummaryResponse> summary(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getSummary(groupId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalhes da despesa recorrente")
    public ResponseEntity<RecurringExpenseResponse> get(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getById(groupId, id));
    }

    @PostMapping
    @Operation(summary = "Criar despesa recorrente")
    public ResponseEntity<RecurringExpenseResponse> create(
            @PathVariable UUID groupId, @Valid @RequestBody RecurringExpenseRequest req,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(groupId, req, user));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar despesa recorrente")
    public ResponseEntity<RecurringExpenseResponse> update(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @Valid @RequestBody RecurringExpenseRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.update(groupId, id, req));
    }

    @PatchMapping("/{id}/pause")
    @Operation(summary = "Pausar")
    public ResponseEntity<RecurringExpenseResponse> pause(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.pause(groupId, id));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancelar")
    public ResponseEntity<RecurringExpenseResponse> cancel(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.cancel(groupId, id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Reativar")
    public ResponseEntity<RecurringExpenseResponse> activate(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.activate(groupId, id));
    }

    @PostMapping("/generate")
    @Operation(summary = "Gerar lançamentos das despesas recorrentes (manual)")
    public ResponseEntity<Map<String, Integer>> generate(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(Map.of("created", service.generateCharges(groupId)));
    }
}
