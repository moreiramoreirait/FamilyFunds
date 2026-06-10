package com.familyfinance.controller;

import com.familyfinance.dto.request.CreditCardRequest;
import com.familyfinance.dto.response.CreditCardInvoiceResponse;
import com.familyfinance.dto.response.CreditCardResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.CreditCardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/credit-cards")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Credit Cards", description = "Gerenciamento de cartões de crédito")
public class CreditCardController {

    private final CreditCardService creditCardService;

    @GetMapping
    @Operation(summary = "Listar cartões de crédito")
    public ResponseEntity<List<CreditCardResponse>> findAll(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(creditCardService.findAll(groupId, currentUser));
    }

    @GetMapping("/{cardId}")
    @Operation(summary = "Buscar cartão por ID")
    public ResponseEntity<CreditCardResponse> findById(
            @PathVariable UUID groupId,
            @PathVariable UUID cardId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(creditCardService.findById(groupId, cardId, currentUser));
    }

    @PostMapping
    @Operation(summary = "Criar cartão de crédito")
    public ResponseEntity<CreditCardResponse> create(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreditCardRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creditCardService.create(groupId, request, currentUser));
    }

    @PutMapping("/{cardId}")
    @Operation(summary = "Atualizar cartão de crédito")
    public ResponseEntity<CreditCardResponse> update(
            @PathVariable UUID groupId,
            @PathVariable UUID cardId,
            @Valid @RequestBody CreditCardRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(creditCardService.update(groupId, cardId, request, currentUser));
    }

    @DeleteMapping("/{cardId}")
    @Operation(summary = "Deletar cartão de crédito")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId,
            @PathVariable UUID cardId,
            @AuthenticationPrincipal User currentUser) {
        creditCardService.delete(groupId, cardId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{cardId}/invoices")
    @Operation(summary = "Listar faturas do cartão")
    public ResponseEntity<List<CreditCardInvoiceResponse>> getInvoices(
            @PathVariable UUID groupId,
            @PathVariable UUID cardId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(creditCardService.getInvoices(groupId, cardId, currentUser));
    }

    @PostMapping("/invoices/{invoiceId}/pay")
    @Operation(summary = "Pagar fatura")
    public ResponseEntity<CreditCardInvoiceResponse> payInvoice(
            @PathVariable UUID groupId,
            @PathVariable UUID invoiceId,
            @RequestParam UUID paymentAccountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paymentDate,
            @AuthenticationPrincipal User currentUser) {
        LocalDate date = paymentDate != null ? paymentDate : LocalDate.now();
        return ResponseEntity.ok(creditCardService.payInvoice(groupId, invoiceId, paymentAccountId, date, currentUser));
    }
}
