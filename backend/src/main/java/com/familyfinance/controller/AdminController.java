package com.familyfinance.controller;

import com.familyfinance.dto.response.AdminGroupResponse;
import com.familyfinance.dto.response.AdminStatsResponse;
import com.familyfinance.dto.response.SubscriptionResponse;
import com.familyfinance.entity.PlanType;
import com.familyfinance.entity.User;
import com.familyfinance.exception.UnauthorizedException;
import com.familyfinance.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    private void requireSystemAdmin(User user) {
        if (!Boolean.TRUE.equals(user.getIsSystemAdmin())) {
            throw new UnauthorizedException("System admin access required");
        }
    }

    @GetMapping("/groups")
    public ResponseEntity<List<AdminGroupResponse>> listGroups(@AuthenticationPrincipal User user) {
        requireSystemAdmin(user);
        return ResponseEntity.ok(adminService.listAllGroups());
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats(@AuthenticationPrincipal User user) {
        requireSystemAdmin(user);
        return ResponseEntity.ok(adminService.getStats());
    }

    @PostMapping("/groups/{groupId}/plan")
    public ResponseEntity<SubscriptionResponse> forceChangePlan(
            @PathVariable UUID groupId,
            @RequestParam PlanType plan,
            @AuthenticationPrincipal User user) {
        requireSystemAdmin(user);
        return ResponseEntity.ok(adminService.forceChangePlan(groupId, plan));
    }
}
