package com.familyfinance.controller;

import com.familyfinance.dto.request.CategoryRequest;
import com.familyfinance.dto.response.CategoryResponse;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.User;
import com.familyfinance.service.CategoryService;
import com.familyfinance.service.FamilyGroupService;
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
@RequestMapping("/api/v1/family-groups/{groupId}/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Category management")
@SecurityRequirement(name = "bearerAuth")
public class CategoryController {

    private final CategoryService categoryService;
    private final FamilyGroupService familyGroupService;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> list(@PathVariable UUID groupId, @AuthenticationPrincipal User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return ResponseEntity.ok(categoryService.getAll(groupId));
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@PathVariable UUID groupId, @Valid @RequestBody CategoryRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(groupId, req, user));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<CategoryResponse> update(@PathVariable UUID groupId, @PathVariable UUID categoryId, @Valid @RequestBody CategoryRequest req, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        return ResponseEntity.ok(categoryService.update(groupId, categoryId, req));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(@PathVariable UUID groupId, @PathVariable UUID categoryId, @AuthenticationPrincipal User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        categoryService.delete(groupId, categoryId);
        return ResponseEntity.noContent().build();
    }
}
