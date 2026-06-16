-- Open Finance (via agregador Pluggy): conexões bancárias + vínculo com contas/transações.
-- O agregador cuida do consentimento/credenciais no banco; aqui guardamos só a referência (item).
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    pluggy_item_id VARCHAR(100) NOT NULL,
    connector_name VARCHAR(150),
    connector_image_url VARCHAR(500),
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    status_detail VARCHAR(255),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    CONSTRAINT uq_bank_connections_item UNIQUE (pluggy_item_id)
);
CREATE INDEX IF NOT EXISTS idx_bank_connections_group ON bank_connections(family_group_id);

-- Vincula uma conta nossa à conta do agregador
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_account_id VARCHAR(100);

-- Id externo da transação (Pluggy) para deduplicar na sincronização
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_transactions_external ON transactions(family_group_id, external_id);
