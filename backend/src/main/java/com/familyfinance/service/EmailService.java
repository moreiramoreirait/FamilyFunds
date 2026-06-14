package com.familyfinance.service;

import com.familyfinance.entity.FamilyGroupInvite;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /** Remetente. Em provedores como Brevo precisa ser um sender verificado. */
    @Value("${app.mail.from:}")
    private String fromEmail;

    private void applyFrom(SimpleMailMessage msg) {
        if (fromEmail != null && !fromEmail.isBlank()) {
            msg.setFrom(fromEmail);
        }
    }

    @Async
    public void sendInviteEmail(FamilyGroupInvite invite, String groupName) {
        try {
            String acceptLink = frontendUrl + "/invite/accept?token=" + invite.getToken();
            SimpleMailMessage msg = new SimpleMailMessage();
            applyFrom(msg);
            msg.setTo(invite.getEmail());
            msg.setSubject("Convite para o grupo " + groupName + " — FamilyFunds");
            msg.setText(
                "Olá!\n\n" +
                invite.getInvitedBy().getName() + " convidou você para participar do grupo \"" + groupName + "\" no FamilyFunds.\n\n" +
                "Clique no link abaixo para aceitar o convite (válido por 7 dias):\n" +
                acceptLink + "\n\n" +
                "Se não esperava este convite, ignore este e-mail.\n\n" +
                "Equipe FamilyFunds"
            );
            mailSender.send(msg);
            log.info("Invite email sent to {}", invite.getEmail());
        } catch (Exception e) {
            log.error("Failed to send invite email to {}", invite.getEmail(), e);
        }
    }

    @Async
    public void sendUsageLimitWarning(String adminEmail, String adminName, String groupName,
                                       String resource, long used, int max) {
        try {
            String pct = Math.round((double) used / max * 100) + "%";
            SimpleMailMessage msg = new SimpleMailMessage();
            applyFrom(msg);
            msg.setTo(adminEmail);
            msg.setSubject("Limite de uso próximo — " + groupName + " | FamilyFunds");
            msg.setText(
                "Olá, " + adminName + "!\n\n" +
                "O grupo \"" + groupName + "\" atingiu " + pct + " do limite de " + resource + " (" + used + "/" + max + ").\n\n" +
                "Considere fazer upgrade para o plano Pro ou Business para continuar sem interrupções.\n\n" +
                "Acesse: " + frontendUrl + "/plans\n\n" +
                "Equipe FamilyFunds"
            );
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send usage warning email to {}", adminEmail, e);
        }
    }
}
