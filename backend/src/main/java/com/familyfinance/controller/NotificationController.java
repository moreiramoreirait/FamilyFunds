package com.familyfinance.controller;

import com.familyfinance.entity.Notification;
import com.familyfinance.entity.User;
import com.familyfinance.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family-groups/{groupId}/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notifications", description = "Gerenciamento de notificações")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Listar todas as notificações")
    public ResponseEntity<List<Notification>> findAll(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(notificationService.findAll(groupId, currentUser));
    }

    @GetMapping("/unread")
    @Operation(summary = "Listar notificações não lidas")
    public ResponseEntity<List<Notification>> findUnread(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(notificationService.findUnread(groupId, currentUser));
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Contar notificações não lidas")
    public ResponseEntity<Map<String, Long>> countUnread(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(currentUser)));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "Marcar notificação como lida")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID groupId,
            @PathVariable UUID notificationId,
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAsRead(notificationId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Marcar todas as notificações como lidas")
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAllAsRead(groupId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
