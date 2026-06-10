package com.familyfinance.controller;

import com.familyfinance.dto.request.AccountRequest;
import com.familyfinance.dto.response.AccountResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.AccountService;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.entity.MemberRole;
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
@RequestMapping("/api/v1/family-groups/{groupId}/accounts")
@RequiredArgsConstructor
@Tag(name = "Accounts", description = "Bank account management")
@SecurityRequirement(name = "bearerAuth")
public class AccountController {

    private final AccountService accountService;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    public ResponseEntity<List<AccountResponse>> list(@PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(accountService.getAll(groupId));
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> getById(@PathVariable UUID groupId, @PathVariable UUID accountId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(accountService.getById(groupId, accountId));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@PathVariable UUID groupId, @Valid @RequestBody AccountRequest request, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(groupId, request, user));
    }

    @PutMapping("/{accountId}")
    public ResponseEntity<AccountResponse> update(@PathVariable UUID groupId, @PathVariable UUID accountId, @Valid @RequestBody AccountRequest request, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(accountService.update(groupId, accountId, request));
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> delete(@PathVariable UUID groupId, @PathVariable UUID accountId, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        accountService.delete(groupId, accountId);
        return ResponseEntity.noContent().build();
    }
}
