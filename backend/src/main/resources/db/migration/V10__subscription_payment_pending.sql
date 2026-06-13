-- Indica que a cobrança da assinatura SaaS falhou e está em período de
-- re-tentativas do Stripe (status past_due/unpaid). O acesso ao plano é
-- mantido durante esse período; serve para avisar o cliente na UI.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_pending BOOLEAN NOT NULL DEFAULT FALSE;
