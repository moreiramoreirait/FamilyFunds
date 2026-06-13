package com.familyfinance.controller;

import com.familyfinance.dto.request.ConvertListRequest;
import com.familyfinance.dto.request.ShoppingListItemRequest;
import com.familyfinance.dto.request.ShoppingListRequest;
import com.familyfinance.dto.response.ShoppingListResponse;
import com.familyfinance.dto.response.ShoppingPurchaseResponse;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.ShoppingListService;
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
@RequestMapping("/api/v1/family-groups/{groupId}/shopping/lists")
@RequiredArgsConstructor
@Tag(name = "Shopping Lists", description = "Listas de compras (checklist; não geram despesa)")
@SecurityRequirement(name = "bearerAuth")
public class ShoppingListController {

    private final ShoppingListService service;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    public ResponseEntity<List<ShoppingListResponse>> list(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.list(groupId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShoppingListResponse> get(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getById(groupId, id));
    }

    @PostMapping
    @Operation(summary = "Criar lista de compras")
    public ResponseEntity<ShoppingListResponse> create(
            @PathVariable UUID groupId, @Valid @RequestBody ShoppingListRequest req,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(groupId, req, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShoppingListResponse> update(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @Valid @RequestBody ShoppingListRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.update(groupId, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        service.delete(groupId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/items")
    @Operation(summary = "Adicionar item à lista")
    public ResponseEntity<ShoppingListResponse> addItem(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @Valid @RequestBody ShoppingListItemRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.addItem(groupId, id, req));
    }

    @PutMapping("/{id}/items/{itemId}")
    @Operation(summary = "Editar item (incl. marcar comprado e valor real)")
    public ResponseEntity<ShoppingListResponse> updateItem(
            @PathVariable UUID groupId, @PathVariable UUID id, @PathVariable UUID itemId,
            @Valid @RequestBody ShoppingListItemRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.updateItem(groupId, id, itemId, req));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<ShoppingListResponse> deleteItem(
            @PathVariable UUID groupId, @PathVariable UUID id, @PathVariable UUID itemId,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.deleteItem(groupId, id, itemId));
    }

    @PostMapping("/{id}/convert-to-purchase")
    @Operation(summary = "Transformar lista em compra (RASCUNHO; não gera despesa)")
    public ResponseEntity<ShoppingPurchaseResponse> convert(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @RequestBody(required = false) ConvertListRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.convertToPurchase(groupId, id, req, user));
    }
}
