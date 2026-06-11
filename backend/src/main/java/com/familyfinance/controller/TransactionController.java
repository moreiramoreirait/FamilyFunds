package com.familyfinance.controller;

import com.familyfinance.dto.request.TransactionRequest;
import com.familyfinance.dto.response.TransactionResponse;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Income and expense management")
@SecurityRequirement(name = "bearerAuth")
public class TransactionController {

    private final TransactionService transactionService;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    @Operation(summary = "List transactions with pagination and optional filters")
    public ResponseEntity<Page<TransactionResponse>> list(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID tagId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(transactionService.getAll(
                groupId, page, size, type, status, accountId, categoryId, tagId, startDate, endDate));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> getById(
            @PathVariable UUID groupId,
            @PathVariable UUID transactionId,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(transactionService.getById(groupId, transactionId));
    }

    @PostMapping
    @Operation(summary = "Create transaction")
    public ResponseEntity<TransactionResponse> create(
            @PathVariable UUID groupId,
            @Valid @RequestBody TransactionRequest request,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(groupId, request, user));
    }

    @PostMapping("/installments")
    @Operation(summary = "Create installment transactions")
    public ResponseEntity<List<TransactionResponse>> createInstallments(
            @PathVariable UUID groupId,
            @Valid @RequestBody TransactionRequest request,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.createInstallments(groupId, request, user));
    }

    @PutMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> update(
            @PathVariable UUID groupId,
            @PathVariable UUID transactionId,
            @Valid @RequestBody TransactionRequest request,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(transactionService.update(groupId, transactionId, request));
    }

    @PatchMapping("/{transactionId}/pay")
    @Operation(summary = "Mark transaction as paid")
    public ResponseEntity<TransactionResponse> markAsPaid(
            @PathVariable UUID groupId,
            @PathVariable UUID transactionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paidDate,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(transactionService.markAsPaid(groupId, transactionId, paidDate));
    }

    @DeleteMapping("/{transactionId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId,
            @PathVariable UUID transactionId,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        transactionService.delete(groupId, transactionId);
        return ResponseEntity.noContent().build();
    }
}
