package com.familyfinance.service;

import com.familyfinance.dto.request.ForgotPasswordRequest;
import com.familyfinance.dto.request.LoginRequest;
import com.familyfinance.dto.request.RegisterRequest;
import com.familyfinance.dto.request.ResetPasswordRequest;
import com.familyfinance.dto.response.AuthResponse;
import com.familyfinance.dto.response.UserResponse;
import com.familyfinance.entity.User;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.repository.UserRepository;
import com.familyfinance.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final JavaMailSender mailSender;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email already registered: " + request.email());
        }

        User user = User.builder()
                .name(request.name())
                .email(request.email().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .isActive(true)
                .emailVerified(false)
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        String token = jwtUtil.generateToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        return AuthResponse.of(token, refreshToken, jwtExpiration, toUserResponse(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException("User not found"));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        return AuthResponse.of(token, refreshToken, jwtExpiration, toUserResponse(user));
    }

    // ─── forgot password ──────────────────────────────────────────────────────

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        // Always return success (no user enumeration)
        userRepository.findByEmail(request.email().toLowerCase()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setPasswordResetToken(token);
            user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(30));
            userRepository.save(user);

            String resetLink = frontendUrl + "/reset-password?token=" + token;
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setTo(user.getEmail());
                msg.setSubject("Redefinição de senha — FinançasFamília");
                msg.setText(
                    "Olá, " + user.getName() + "!\n\n" +
                    "Recebemos uma solicitação para redefinir a senha da sua conta.\n\n" +
                    "Clique no link abaixo (válido por 30 minutos):\n" + resetLink + "\n\n" +
                    "Se não foi você, ignore este e-mail.\n\n" +
                    "Equipe FinançasFamília"
                );
                mailSender.send(msg);
                log.info("Password reset email sent to {}", user.getEmail());
            } catch (Exception e) {
                log.error("Failed to send password reset email to {}", user.getEmail(), e);
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.token())
                .orElseThrow(() -> new BusinessException("Token inválido ou expirado"));

        if (user.getPasswordResetExpiresAt() == null
                || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Token expirado. Solicite um novo link.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        userRepository.save(user);
        log.info("Password reset successfully for {}", user.getEmail());
    }

    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getPhone(),
                user.getEmailVerified(),
                user.getIsSystemAdmin(),
                user.getCreatedAt()
        );
    }
}
