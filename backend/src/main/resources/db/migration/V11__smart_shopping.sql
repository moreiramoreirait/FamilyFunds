-- Módulo Compras Inteligentes: compras de supermercado + itens + histórico de preços.
-- A compra gera no máximo UM lançamento financeiro (valor total) em transactions.

CREATE TABLE IF NOT EXISTS shopping_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    store_name VARCHAR(160),
    store_cnpj VARCHAR(20),
    purchase_date DATE,
    total_amount NUMERIC(15,2),
    payment_method VARCHAR(30),
    account_id UUID REFERENCES accounts(id),
    credit_card_id UUID REFERENCES credit_cards(id),
    category_id UUID REFERENCES categories(id),
    source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    qr_code_url TEXT,
    access_key VARCHAR(60),
    raw_html TEXT,
    extraction_status VARCHAR(30),
    extraction_error TEXT,
    financial_transaction_id UUID REFERENCES transactions(id),
    status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_purchase_group ON shopping_purchases (family_group_id);
CREATE INDEX IF NOT EXISTS idx_shop_purchase_status ON shopping_purchases (status);

CREATE TABLE IF NOT EXISTS shopping_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES shopping_purchases(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    normalized_product_name VARCHAR(200),
    product_code VARCHAR(60),
    brand VARCHAR(120),
    category VARCHAR(120),
    quantity NUMERIC(12,3),
    unit VARCHAR(20),
    unit_price NUMERIC(15,4),
    total_price NUMERIC(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_item_purchase ON shopping_purchase_items (purchase_id);

CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    product_name VARCHAR(200) NOT NULL,
    normalized_product_name VARCHAR(200) NOT NULL,
    store_name VARCHAR(160),
    store_cnpj VARCHAR(20),
    unit_price NUMERIC(15,4),
    quantity NUMERIC(12,3),
    unit VARCHAR(20),
    purchase_date DATE,
    purchase_id UUID REFERENCES shopping_purchases(id) ON DELETE CASCADE,
    purchase_item_id UUID REFERENCES shopping_purchase_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_hist_group_prod
    ON product_price_history (family_group_id, normalized_product_name);
