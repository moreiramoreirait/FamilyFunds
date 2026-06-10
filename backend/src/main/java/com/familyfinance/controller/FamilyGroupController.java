package com.familyfinance.controller;

import com.familyfinance.dto.request.FamilyGroupRequest;
import com.familyfinance.dto.request.InviteMemberRequest;
import com.familyfinance.dto.response.FamilyGroupResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.FamilyGroupService;
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
@RequestMapping("/api/v1/family-groups")
@RequiredArgsConstructor
@Tag(name = "Family Groups", description = "Family group management")
@SecurityRequirement(name = "bearerAuth")
public class FamilyGroupController {

    private final FamilyGroupService familyGroupService;

    @GetMapping
    @Operation(summary = "List user's family groups")
    public ResponseEntity<List<FamilyGroupResponse>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.getUserGroups(user));
    }

    @PostMapping
    @Operation(summary = "Create family group")
    public ResponseEntity<FamilyGroupResponse> create(
            @Valid @RequestBody FamilyGroupRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(familyGroupService.create(request, user));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get family group by ID")
    public ResponseEntity<FamilyGroupResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.getById(id, user));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update family group")
    public ResponseEntity<FamilyGroupResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody FamilyGroupRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.update(id, request, user));
    }

    @PostMapping("/{id}/invite")
    @Operation(summary = "Invite member")
    public ResponseEntity<Void> invite(
            @PathVariable UUID id,
            @Valid @RequestBody InviteMemberRequest request,
            @AuthenticationPrincipal User user) {
        familyGroupService.inviteMember(id, request, user);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/invites/{token}/accept")
    @Operation(summary = "Accept invite")
    public ResponseEntity<Void> acceptInvite(
            @PathVariable String token,
            @AuthenticationPrincipal User user) {
        familyGroupService.acceptInvite(token, user);
        return ResponseEntity.ok().build();
    }
}
