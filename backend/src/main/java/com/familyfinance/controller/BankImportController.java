package com.familyfinance.controller;

import com.familyfinance.dto.BankImportResponse;
import com.familyfinance.dto.ConfirmImportRequest;
import com.familyfinance.service.BankImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/imports")
@RequiredArgsConstructor
@Tag(name = "Bank Imports", description = "Import bank statements (CSV / OFX / XLSX)")
@SecurityRequirement(name = "bearerAuth")
public class BankImportController {

    private final BankImportService bankImportService;

    @GetMapping
    @Operation(summary = "List all imports for this group")
    public ResponseEntity<Page<BankImportResponse>> list(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(bankImportService.listImports(groupId, page, size));
    }

    @GetMapping("/{importId}")
    @Operation(summary = "Get import details including items")
    public ResponseEntity<BankImportResponse> get(
            @PathVariable UUID groupId,
            @PathVariable UUID importId
    ) {
        return ResponseEntity.ok(bankImportService.getImport(groupId, importId));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and parse a bank statement file")
    public ResponseEntity<BankImportResponse> upload(
            @PathVariable UUID groupId,
            @RequestParam UUID accountId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                bankImportService.uploadAndParse(groupId, accountId, file, userDetails.getUsername()));
    }

    @PostMapping("/{importId}/confirm")
    @Operation(summary = "Confirm (create transactions for) selected import items")
    public ResponseEntity<BankImportResponse> confirm(
            @PathVariable UUID groupId,
            @PathVariable UUID importId,
            @Valid @RequestBody ConfirmImportRequest request
    ) {
        return ResponseEntity.ok(
                bankImportService.confirmItems(groupId, importId, request.itemIds()));
    }

    @DeleteMapping("/{importId}")
    @Operation(summary = "Delete an import and all its items")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId,
            @PathVariable UUID importId
    ) {
        bankImportService.deleteImport(groupId, importId);
        return ResponseEntity.noContent().build();
    }
}
