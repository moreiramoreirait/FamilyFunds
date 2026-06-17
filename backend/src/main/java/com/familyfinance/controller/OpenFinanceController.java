package com.familyfinance.controller;

import com.familyfinance.dto.request.SaveConnectionRequest;
import com.familyfinance.dto.response.BankConnectionResponse;
import com.familyfinance.dto.response.ConnectTokenResponse;
import com.familyfinance.dto.response.SyncResultResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.openfinance.OpenFinanceService;
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
@RequestMapping("/api/v1/family-groups/{groupId}/open-finance")
@RequiredArgsConstructor
@Tag(name = "Open Finance", description = "Conexão bancária via Pluggy (Premium)")
@SecurityRequirement(name = "bearerAuth")
public class OpenFinanceController {

    private final OpenFinanceService service;

    @PostMapping("/connect-token")
    @Operation(summary = "Gerar token do widget Pluggy Connect")
    public ResponseEntity<ConnectTokenResponse> connectToken(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new ConnectTokenResponse(service.createConnectToken(groupId, user)));
    }

    @PostMapping("/connections")
    @Operation(summary = "Salvar conexão após o widget (itemId)")
    public ResponseEntity<BankConnectionResponse> saveConnection(
            @PathVariable UUID groupId, @Valid @RequestBody SaveConnectionRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.saveConnection(groupId, req.itemId(), user));
    }

    @GetMapping("/connections")
    @Operation(summary = "Listar conexões bancárias")
    public ResponseEntity<List<BankConnectionResponse>> list(
            @PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.listConnections(groupId, user));
    }

    @DeleteMapping("/connections/{id}")
    @Operation(summary = "Remover conexão bancária")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        service.deleteConnection(groupId, id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/connections/{id}/sync")
    @Operation(summary = "Sincronizar contas e extrato da conexão")
    public ResponseEntity<SyncResultResponse> sync(
            @PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.syncConnection(groupId, id, user));
    }
}
