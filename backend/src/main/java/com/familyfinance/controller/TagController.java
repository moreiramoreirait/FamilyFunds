package com.familyfinance.controller;

import com.familyfinance.dto.response.TagResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/tags")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@io.swagger.v3.oas.annotations.tags.Tag(name = "Tags", description = "Gerenciamento de tags")
public class TagController {

    private final TagService tagService;

    public record TagRequest(@NotBlank String name, String color) {}

    private TagResponse toResponse(com.familyfinance.entity.Tag t) {
        return new TagResponse(t.getId(), t.getName(), t.getColor());
    }

    @GetMapping
    @Operation(summary = "Listar tags")
    public ResponseEntity<List<TagResponse>> findAll(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(tagService.findAll(groupId, currentUser).stream().map(this::toResponse).toList());
    }

    @PostMapping
    @Operation(summary = "Criar tag")
    public ResponseEntity<TagResponse> create(
            @PathVariable UUID groupId,
            @RequestBody TagRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(tagService.create(groupId, request.name(), request.color(), currentUser)));
    }

    @PutMapping("/{tagId}")
    @Operation(summary = "Atualizar tag")
    public ResponseEntity<TagResponse> update(
            @PathVariable UUID groupId,
            @PathVariable UUID tagId,
            @RequestBody TagRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(toResponse(tagService.update(groupId, tagId, request.name(), request.color(), currentUser)));
    }

    @DeleteMapping("/{tagId}")
    @Operation(summary = "Deletar tag")
    public ResponseEntity<Void> delete(
            @PathVariable UUID groupId,
            @PathVariable UUID tagId,
            @AuthenticationPrincipal User currentUser) {
        tagService.delete(groupId, tagId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
