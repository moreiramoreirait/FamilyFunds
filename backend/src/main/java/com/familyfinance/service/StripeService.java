package com.familyfinance.service;

import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.repository.PaymentEventRepository;
import com.familyfinance.repository.SubscriptionRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StripeService {

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final SubscriptionService subscriptionService;

    @Value("${stripe.secret-key:}") private String secretKey;
    @Value("${stripe.webhook-secret:}") private String webhookSecret;
    @Value("${stripe.price-essencial:}") private String priceEssencial;
    @Value("${stripe.price-premium:}") private String pricePremium;
    @Value("${app.frontend-url}") private String frontendUrl;

    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isBlank()) {
            Stripe.apiKey = secretKey;
            log.info("Stripe initialized");
        } else {
            log.warn("Stripe secret key not configured — payment features disabled");
        }
    }

    public String createCheckoutSession(UUID familyGroupId, PlanType plan, User user) {
        assertConfigured();
        if (plan == PlanType.FREE) {
            throw new BusinessException("O plano Free não requer pagamento.");
        }
        String priceId = getPriceId(plan);
        if (priceId == null || priceId.isBlank()) {
            throw new BusinessException("Price ID do plano " + plan.getDisplayName() + " não configurado no servidor.");
        }

        String customerId = getOrCreateCustomer(familyGroupId, user);

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setCustomer(customerId)
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(priceId)
                            .setQuantity(1L)
                            .build())
                    .setSuccessUrl(frontendUrl + "/plans?success=true")
                    .setCancelUrl(frontendUrl + "/plans")
                    .putMetadata("groupId", familyGroupId.toString())
                    .putMetadata("plan", plan.name())
                    .build();

            Session session = Session.create(params);
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Stripe checkout session error: {}", e.getMessage());
            throw new BusinessException("Erro ao criar sessão de pagamento: " + e.getMessage());
        }
    }

    public String createPortalSession(UUID familyGroupId) {
        assertConfigured();
        Subscription sub = subscriptionRepository.findByFamilyGroupId(familyGroupId)
                .orElseThrow(() -> new BusinessException("Assinatura não encontrada."));

        if (sub.getStripeCustomerId() == null) {
            throw new BusinessException("Nenhuma assinatura Stripe encontrada para este grupo.");
        }

        try {
            com.stripe.param.billingportal.SessionCreateParams params =
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                            .setCustomer(sub.getStripeCustomerId())
                            .setReturnUrl(frontendUrl + "/plans")
                            .build();

            com.stripe.model.billingportal.Session portalSession =
                    com.stripe.model.billingportal.Session.create(params);
            return portalSession.getUrl();
        } catch (StripeException e) {
            log.error("Stripe portal session error: {}", e.getMessage());
            throw new BusinessException("Erro ao abrir portal de faturamento: " + e.getMessage());
        }
    }

    @Transactional
    public void processWebhookEvent(String payload, String sigHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Stripe webhook secret not configured — skipping verification");
            return;
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new BusinessException("Assinatura Stripe inválida");
        }

        if (paymentEventRepository.existsByStripeEventId(event.getId())) {
            log.debug("Stripe event {} already processed", event.getId());
            return;
        }

        log.info("Processing Stripe event: {} ({})", event.getType(), event.getId());

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutCompleted(event);
            case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
            case "invoice.payment_failed" -> handlePaymentFailed(event);
            default -> log.debug("Unhandled Stripe event type: {}", event.getType());
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Extrai o objeto do evento de forma resiliente a diferenças de versão da API
     * do Stripe. Quando a versão da conta é mais nova que a do SDK, getObject()
     * retorna vazio; nesse caso usamos deserializeUnsafe() (parse direto do JSON do
     * evento) para evitar 500 no webhook.
     */
    private com.stripe.model.StripeObject extractObject(Event event) {
        return event.getDataObjectDeserializer().getObject().orElseGet(() -> {
            try {
                return event.getDataObjectDeserializer().deserializeUnsafe();
            } catch (com.stripe.exception.EventDataObjectDeserializationException e) {
                throw new BusinessException("Falha ao desserializar evento Stripe: " + e.getMessage());
            }
        });
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = (Session) extractObject(event);

        String groupIdStr = session.getMetadata().get("groupId");
        String planStr = session.getMetadata().get("plan");
        if (groupIdStr == null || planStr == null) return;

        UUID groupId = UUID.fromString(groupIdStr);
        PlanType plan = PlanType.valueOf(planStr);

        subscriptionService.upgradePlan(groupId, plan);

        subscriptionRepository.findByFamilyGroupId(groupId).ifPresent(sub -> {
            sub.setStripeSubscriptionId(session.getSubscription());
            subscriptionRepository.save(sub);
        });

        saveEvent(event.getId(), event.getType(), groupId, plan, null);
        log.info("Activated {} plan for group {}", plan, groupId);
    }

    private void handleSubscriptionUpdated(Event event) {
        com.stripe.model.Subscription stripeSub = (com.stripe.model.Subscription) extractObject(event);
        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId()).ifPresent(sub -> {
            String status = stripeSub.getStatus(); // active, past_due, unpaid, canceled, ...
            boolean pending = "past_due".equals(status) || "unpaid".equals(status);
            if (sub.isPaymentPending() != pending) {
                sub.setPaymentPending(pending);
                subscriptionRepository.save(sub);
                log.info("Subscription do grupo {} payment_pending={} (status Stripe: {})",
                        sub.getFamilyGroup().getId(), pending, status);
            }
            saveEvent(event.getId(), event.getType(), sub.getFamilyGroup().getId(), null, null);
        });
    }

    private void handleSubscriptionDeleted(Event event) {
        com.stripe.model.Subscription stripeSub = (com.stripe.model.Subscription) extractObject(event);

        subscriptionRepository.findByStripeSubscriptionId(stripeSub.getId()).ifPresent(sub -> {
            UUID groupId = sub.getFamilyGroup().getId();
            subscriptionService.cancelSubscription(groupId);
            saveEvent(event.getId(), event.getType(), groupId, null, null);
            log.info("Cancelled subscription for group {}", groupId);
        });
    }

    private void handlePaymentFailed(Event event) {
        Invoice invoice = (Invoice) extractObject(event);
        subscriptionRepository.findByStripeCustomerId(invoice.getCustomer()).ifPresent(sub -> {
            UUID groupId = sub.getFamilyGroup().getId();
            saveEvent(event.getId(), event.getType(), groupId, null, null);
            log.warn("Payment failed for group {}", groupId);
        });
    }

    private String getOrCreateCustomer(UUID familyGroupId, User user) {
        return subscriptionRepository.findByFamilyGroupId(familyGroupId)
                .map(sub -> {
                    if (sub.getStripeCustomerId() != null) return sub.getStripeCustomerId();
                    String customerId = createStripeCustomer(user.getEmail(), user.getName());
                    sub.setStripeCustomerId(customerId);
                    subscriptionRepository.save(sub);
                    return customerId;
                })
                .orElseGet(() -> createStripeCustomer(user.getEmail(), user.getName()));
    }

    private String createStripeCustomer(String email, String name) {
        try {
            Customer customer = Customer.create(
                    CustomerCreateParams.builder().setEmail(email).setName(name).build());
            return customer.getId();
        } catch (StripeException e) {
            throw new BusinessException("Erro ao criar cliente Stripe: " + e.getMessage());
        }
    }

    private void saveEvent(String stripeEventId, String type, UUID groupId, PlanType plan, BigDecimal amount) {
        paymentEventRepository.save(PaymentEvent.builder()
                .stripeEventId(stripeEventId)
                .eventType(type)
                .familyGroupId(groupId)
                .plan(plan)
                .amount(amount)
                .currency("brl")
                .build());
    }

    private String getPriceId(PlanType plan) {
        return switch (plan) {
            case ESSENCIAL -> priceEssencial;
            case PREMIUM -> pricePremium;
            default -> null;
        };
    }

    private void assertConfigured() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new BusinessException("Pagamento via Stripe ainda não configurado. Configure as variáveis STRIPE_SECRET_KEY, STRIPE_PRICE_ESSENCIAL e STRIPE_PRICE_PREMIUM.");
        }
    }
}
