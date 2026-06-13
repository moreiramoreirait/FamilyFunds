-- Listas de compras (checklist/planejamento). NÃO geram despesa automaticamente.
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    name VARCHAR(160) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTA',
    estimated_total NUMERIC(15,2),
    converted_purchase_id UUID REFERENCES shopping_purchases(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_list_group ON shopping_lists (family_group_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    normalized_product_name VARCHAR(200),
    category VARCHAR(120),
    quantity NUMERIC(12,3),
    unit VARCHAR(20),
    estimated_unit_price NUMERIC(15,4),
    estimated_total_price NUMERIC(15,2),
    last_paid_price NUMERIC(15,4),
    preferred_store VARCHAR(160),
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    real_unit_price NUMERIC(15,4),
    real_total_price NUMERIC(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_list_item_list ON shopping_list_items (shopping_list_id);
