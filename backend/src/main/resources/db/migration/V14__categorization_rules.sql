-- Regras de categorização automática: palavra-chave (na descrição) -> categoria.
-- Aplicadas ao criar lançamentos manuais e ao confirmar itens de importação.
CREATE TABLE IF NOT EXISTS categorization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    keyword VARCHAR(120) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    CONSTRAINT uq_categ_rule UNIQUE (family_group_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_categ_rules_group ON categorization_rules(family_group_id);
