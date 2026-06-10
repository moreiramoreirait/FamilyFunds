package com.familyfinance.controller;

import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.CostCenterRepository;
import com.familyfinance.service.FamilyGroupService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/cost-centers")
@RequiredArgsConstructor
@Tag(name = "Cost Centers", description = "Cost center management")
@SecurityRequirement(name = "bearerAuth")
public class CostCenterController {

    private final CostCenterRepository costCenterRepository;
    private final FamilyGroupService familyGroupService;

    record CostCenterRequest(@NotBlank @Size(max = 100) String name, String description, String color, String icon) {}
    record CostCenterResponse(UUID id, String name, String description, String color, String icon, Boolean isActive) {}

    @GetMapping
    public ResponseEntity<List<CostCenterResponse>> list(@PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(costCenterRepository.findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(groupId)
                .stream().map(c -> new CostCenterResponse(c.getId(), c.getName(), c.getDescription(), c.getColor(), c.getIcon(), c.getIsActive())).toList());
    }

    @PostMapping
    public ResponseEntity<CostCenterResponse> create(@PathVariable UUID groupId, @Valid @RequestBody CostCenterRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        if (costCenterRepository.existsByFamilyGroupIdAndNameIgnoreCase(groupId, req.name())) {
            throw new BusinessException("Cost center with this name already exists");
        }
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);
        CostCenter cc = CostCenter.builder().familyGroup(group).name(req.name()).description(req.description())
                .color(req.color()).icon(req.icon()).isActive(true).createdBy(user).build();
        cc = costCenterRepository.save(cc);
        return ResponseEntity.status(HttpStatus.CREATED).body(new CostCenterResponse(cc.getId(), cc.getName(), cc.getDescription(), cc.getColor(), cc.getIcon(), cc.getIsActive()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CostCenterResponse> update(@PathVariable UUID groupId, @PathVariable UUID id, @Valid @RequestBody CostCenterRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        CostCenter cc = costCenterRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("CostCenter", "id", id));
        cc.setName(req.name()); cc.setDescription(req.description()); cc.setColor(req.color()); cc.setIcon(req.icon());
        cc = costCenterRepository.save(cc);
        return ResponseEntity.ok(new CostCenterResponse(cc.getId(), cc.getName(), cc.getDescription(), cc.getColor(), cc.getIcon(), cc.getIsActive()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID groupId, @PathVariable UUID id, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        CostCenter cc = costCenterRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("CostCenter", "id", id));
        cc.setIsActive(false);
        costCenterRepository.save(cc);
        return ResponseEntity.noContent().build();
    }
}
