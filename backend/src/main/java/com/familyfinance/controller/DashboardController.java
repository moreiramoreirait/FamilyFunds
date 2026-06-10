package com.familyfinance.controller;

import com.familyfinance.dto.response.DashboardResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.DashboardService;
import com.familyfinance.service.FamilyGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard KPIs and charts")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    @Operation(summary = "Get dashboard data")
    public ResponseEntity<DashboardResponse> getDashboard(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(dashboardService.getDashboard(groupId));
    }
}
