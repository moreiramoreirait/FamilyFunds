package com.familyfinance.controller;

import com.familyfinance.dto.response.SubscriptionResponse;
import com.familyfinance.entity.PlanType;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    public ResponseEntity<SubscriptionResponse> get(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        return ResponseEntity.ok(subscriptionService.getSubscription(groupId));
    }

    @PostMapping("/upgrade")
    public ResponseEntity<SubscriptionResponse> upgrade(
            @PathVariable UUID groupId,
            @RequestParam PlanType plan,
            @AuthenticationPrincipal User currentUser) {
        familyGroupService.assertAdmin(groupId, currentUser.getId());
        return ResponseEntity.ok(subscriptionService.upgradePlan(groupId, plan));
    }

    @PostMapping("/cancel")
    public ResponseEntity<SubscriptionResponse> cancel(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        familyGroupService.assertAdmin(groupId, currentUser.getId());
        return ResponseEntity.ok(subscriptionService.cancelSubscription(groupId));
    }
}
