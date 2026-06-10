package com.familyfinance.controller;

import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.ReportService;
import com.familyfinance.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final FamilyGroupService familyGroupService;
    private final SubscriptionService subscriptionService;

    @GetMapping("/cash-flow/excel")
    public ResponseEntity<byte[]> cashFlowExcel(
            @PathVariable UUID groupId,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) throws Exception {
        familyGroupService.assertMember(groupId, currentUser.getId());
        subscriptionService.checkAdvancedReportsAccess(groupId);
        int y = year != null ? year : LocalDate.now().getYear();
        byte[] data = reportService.generateCashFlowExcel(groupId, y);
        return fileResponse(data, "fluxo-de-caixa-" + y + ".xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @GetMapping("/cash-flow/pdf")
    public ResponseEntity<byte[]> cashFlowPdf(
            @PathVariable UUID groupId,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) throws Exception {
        familyGroupService.assertMember(groupId, currentUser.getId());
        subscriptionService.checkAdvancedReportsAccess(groupId);
        int y = year != null ? year : LocalDate.now().getYear();
        byte[] data = reportService.generateCashFlowPdf(groupId, y);
        return fileResponse(data, "fluxo-de-caixa-" + y + ".pdf", "application/pdf");
    }

    @GetMapping("/categories/excel")
    public ResponseEntity<byte[]> categoryExcel(
            @PathVariable UUID groupId,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) throws Exception {
        familyGroupService.assertMember(groupId, currentUser.getId());
        subscriptionService.checkAdvancedReportsAccess(groupId);
        int y = year != null ? year : LocalDate.now().getYear();
        byte[] data = reportService.generateCategoryExcel(groupId, y);
        return fileResponse(data, "categorias-" + y + ".xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @GetMapping("/categories/pdf")
    public ResponseEntity<byte[]> categoryPdf(
            @PathVariable UUID groupId,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) throws Exception {
        familyGroupService.assertMember(groupId, currentUser.getId());
        subscriptionService.checkAdvancedReportsAccess(groupId);
        int y = year != null ? year : LocalDate.now().getYear();
        byte[] data = reportService.generateCategoryPdf(groupId, y);
        return fileResponse(data, "categorias-" + y + ".pdf", "application/pdf");
    }

    private ResponseEntity<byte[]> fileResponse(byte[] data, String filename, String contentType) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(data.length)
                .body(data);
    }
}
