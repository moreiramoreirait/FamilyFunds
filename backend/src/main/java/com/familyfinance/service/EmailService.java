package com.familyfinance.service;

import com.familyfinance.entity.FamilyGroupInvite;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /** Remetente. Em provedores como Brevo precisa ser um sender verificado. */
    @Value("${app.mail.from:}")
    private String fromEmail;

    /** Se setada, envia via API HTTP do Brevo (porta 443) — necessário no Render, que bloqueia SMTP. */
    @Value("${app.mail.brevo-api-key:}")
    private String brevoApiKey;

    @Async
    public void sendInviteEmail(FamilyGroupInvite invite, String groupName) {
        String acceptLink = frontendUrl + "/invite/accept?token=" + invite.getToken();
        String text =
                "Olá!\n\n" +
                invite.getInvitedBy().getName() + " convidou você para participar do grupo \"" + groupName + "\" no FamilyFunds.\n\n" +
                "Clique no link abaixo para aceitar o convite (válido por 7 dias):\n" +
                acceptLink + "\n\n" +
                "Se não esperava este convite, ignore este e-mail.\n\n" +
                "Equipe FamilyFunds";
        deliver(invite.getEmail(), "Convite para o grupo " + groupName + " — FamilyFunds", text);
    }

    @Async
    public void sendUsageLimitWarning(String adminEmail, String adminName, String groupName,
                                       String resource, long used, int max) {
        String pct = Math.round((double) used / max * 100) + "%";
        String text =
                "Olá, " + adminName + "!\n\n" +
                "O grupo \"" + groupName + "\" atingiu " + pct + " do limite de " + resource + " (" + used + "/" + max + ").\n\n" +
                "Considere fazer upgrade para continuar sem interrupções.\n\n" +
                "Acesse: " + frontendUrl + "/plans\n\n" +
                "Equipe FamilyFunds";
        deliver(adminEmail, "Limite de uso próximo — " + groupName + " | FamilyFunds", text);
    }

    /** Envia o e-mail; nunca propaga falha (não pode quebrar o fluxo principal). */
    private void deliver(String to, String subject, String text) {
        try {
            if (brevoApiKey != null && !brevoApiKey.isBlank()) {
                sendViaBrevoApi(to, subject, text);
            } else {
                sendViaSmtp(to, subject, text);
            }
            log.info("Email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}", to, e);
        }
    }

    private void sendViaSmtp(String to, String subject, String text) {
        SimpleMailMessage msg = new SimpleMailMessage();
        if (fromEmail != null && !fromEmail.isBlank()) msg.setFrom(fromEmail);
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(text);
        mailSender.send(msg);
    }

    private void sendViaBrevoApi(String to, String subject, String text) throws Exception {
        String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "no-reply@familyfunds.app";
        Map<String, Object> body = Map.of(
                "sender", Map.of("email", sender, "name", "FamilyFunds"),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "textContent", text
        );
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", brevoApiKey)
                .header("Content-Type", "application/json")
                .header("accept", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();
        HttpResponse<String> resp = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            throw new RuntimeException("Brevo API respondeu " + resp.statusCode() + ": " + resp.body());
        }
    }
}
