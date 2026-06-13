package com.familyfinance.controller;

import com.familyfinance.dto.request.GenerateShoppingTransactionRequest;
import com.familyfinance.dto.request.ImportReceiptRequest;
import com.familyfinance.dto.request.ShoppingPurchaseRequest;
import com.familyfinance.dto.response.PriceHistoryResponse;
import com.familyfinance.dto.response.ShoppingPurchaseResponse;
import com.familyfinance.dto.response.ShoppingSummaryResponse;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.ShoppingSourceType;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.NfceImportService;
import com.familyfinance.service.ShoppingPurchaseService;
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
@RequestMapping("/api/v1/family-groups/{groupId}/shopping")
@RequiredArgsConstructor
@Tag(name = "Smart Shopping", description = "Compras Inteligentes (supermercado, NFC-e, histórico de preços)")
@SecurityRequirement(name = "bearerAuth")
public class ShoppingPurchaseController {

    private final ShoppingPurchaseService service;
    private final NfceImportService nfceImportService;
    private final FamilyGroupService familyGroupService;

    @GetMapping("/purchases")
    @Operation(summary = "Listar compras")
    public ResponseEntity<List<ShoppingPurchaseResponse>> list(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.list(groupId));
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumo (cards) de compras")
    public ResponseEntity<ShoppingSummaryResponse> summary(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getSummary(groupId));
    }

    @GetMapping("/purchases/{id}")
    @Operation(summary = "Detalhes da compra")
    public ResponseEntity<ShoppingPurchaseResponse> get(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.getById(groupId, id));
    }

    @PostMapping("/purchases/manual")
    @Operation(summary = "Cadastrar compra manual")
    public ResponseEntity<ShoppingPurchaseResponse> createManual(
            @PathVariable UUID groupId, @Valid @RequestBody ShoppingPurchaseRequest req,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createManual(groupId, req, user));
    }

    @PutMapping("/purchases/{id}")
    @Operation(summary = "Editar compra")
    public ResponseEntity<ShoppingPurchaseResponse> update(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @Valid @RequestBody ShoppingPurchaseRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.update(groupId, id, req));
    }

    @DeleteMapping("/purchases/{id}")
    @Operation(summary = "Excluir compra")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        service.delete(groupId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/purchases/{id}/finalize")
    @Operation(summary = "Finalizar compra (sai de rascunho)")
    public ResponseEntity<ShoppingPurchaseResponse> finalize(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.finalize(groupId, id));
    }

    @PostMapping("/purchases/{id}/generate-transaction")
    @Operation(summary = "Gerar despesa financeira (lançamento único, valor total)")
    public ResponseEntity<ShoppingPurchaseResponse> generateTransaction(
            @PathVariable UUID groupId, @PathVariable UUID id,
            @Valid @RequestBody GenerateShoppingTransactionRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(service.generateTransaction(groupId, id, req, user));
    }

    @PostMapping("/receipts/import-from-url")
    @Operation(summary = "Importar NFC-e por link colado (parser no backend; fallback manual se falhar)")
    public ResponseEntity<ShoppingPurchaseResponse> importFromUrl(
            @PathVariable UUID groupId, @Valid @RequestBody ImportReceiptRequest req,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nfceImportService.importReceipt(groupId, req.url(), ShoppingSourceType.NFC_URL, user));
    }

    @PostMapping("/receipts/import-from-qrcode")
    @Operation(summary = "Importar NFC-e a partir da URL lida do QR Code")
    public ResponseEntity<ShoppingPurchaseResponse> importFromQrCode(
            @PathVariable UUID groupId, @Valid @RequestBody ImportReceiptRequest req,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nfceImportService.importReceipt(groupId, req.url(), ShoppingSourceType.QR_CODE, user));
    }

    @GetMapping("/price-history")
    @Operation(summary = "Histórico de preços (resumo por produto)")
    public ResponseEntity<List<PriceHistoryResponse>> priceHistory(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.priceHistory(groupId));
    }

    @GetMapping("/price-history/{normalizedName}")
    @Operation(summary = "Histórico de preços de um produto")
    public ResponseEntity<PriceHistoryResponse> priceHistoryDetail(
            @PathVariable UUID groupId, @PathVariable String normalizedName, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(service.priceHistoryDetail(groupId, normalizedName));
    }
}
