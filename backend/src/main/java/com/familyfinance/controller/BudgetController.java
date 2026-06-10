package com.familyfinance.controller;

import com.familyfinance.dto.request.BudgetRequest;
import com.familyfinance.dto.response.BudgetResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.BudgetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/budgets")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Budgets", description = "Gerenciamento de orçamentos")
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping
    @Operation(summary = "Listar orçamentos por mês/ano")
    public ResponseEntity<List<BudgetResponse>> findAll(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int month,
            @RequestParam(defaultValue = "0") int year,
            @AuthenticationPrincipal User currentUser) {
        int m = month > 0 ? month : LocalDate.now().getMonthValue();
        int y = year > 0 ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(budgetService.findAll(groupId, m, y, currentUser));
    }

    @GetMapping("/{budgetId}")
    @Operation(summary = "Buscar orçamento por ID")
    public ResponseEntity<BudgetResponse> findById(
            @PathVariable UUID groupId,
            @PathVariable UUID budgetId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(budgetService.findById(groupId, budgetId, currentUser));
    }

    @PostMapping
    @Operation(summary = "Criar orçamento")
    public ResponseEntity<BudgetResponse> create(
            @PathVariable UUID groupId,
            @Valid @RequestBody BudgetRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetService.create(groupId, request, currentUser));
    }

    @PutMapping("/{budgetId}")
    @Operation(summary = "Atualizar orçamento")
    public ResponseEntity<BudgetResponse> update(
            @PathVariable UUID groupId,
            @PathVariable UUID budgetId,
            @Valid @RequestBody BudgetRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(budgetService.update(groupId, budgetId, request, currentUser));
    }

    @DeleteMapping("/{budgetId}")
    @Operation(summary = "Deletar orçamento")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId,
            @PathVariable UUID budgetId,
            @AuthenticationPrincipal User currentUser) {
        budgetService.delete(groupId, budgetId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
