-- Origem dos lançamentos: distingue manual de gerado por assinatura/despesa recorrente
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS origin_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_reference_date DATE;

-- Índice usado para deduplicação (mesma origem + mesma competência não gera de novo)
CREATE INDEX IF NOT EXISTS idx_tx_origin
    ON transactions (origin_type, origin_id, recurrence_reference_date);

-- Assinaturas de serviços (Netflix, Spotify, ChatGPT, ...)
-- OBS: nome distinto da tabela `subscriptions` (assinatura SaaS do plano).
CREATE TABLE IF NOT EXISTS service_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    amount NUMERIC(15,2) NOT NULL,
    billing_day INT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    category_id UUID REFERENCES categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    payment_account_id UUID REFERENCES accounts(id),
    credit_card_id UUID REFERENCES credit_cards(id),
    payment_method VARCHAR(30),
    recurrence_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    next_charge_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_sub_group ON service_subscriptions (family_group_id);
CREATE INDEX IF NOT EXISTS idx_service_sub_status ON service_subscriptions (status);
