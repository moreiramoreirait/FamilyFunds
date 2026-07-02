package com.familyfinance.controller;

import com.familyfinance.dto.request.DeleteAccountRequest;
import com.familyfinance.dto.response.UserResponse;
import com.familyfinance.entity.User;
import com.familyfinance.service.AccountDeletionService;
import com.familyfinance.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile endpoints")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final AuthService authService;
    private final AccountDeletionService accountDeletionService;

    @GetMapping("/me")
    @Operation(summary = "Get current user")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.toUserResponse(user));
    }

    @PostMapping("/me/delete")
    @Operation(summary = "Excluir a própria conta (LGPD) — anonimiza e limpa dados")
    public ResponseEntity<Void> deleteMyAccount(
            @AuthenticationPrincipal User user, @Valid @RequestBody DeleteAccountRequest req) {
        accountDeletionService.deleteOwnAccount(user, req.password());
        return ResponseEntity.noContent().build();
    }
}
