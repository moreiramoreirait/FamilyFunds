CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    account_id UUID REFERENCES accounts(id),
    destination_account_id UUID REFERENCES accounts(id),
    credit_card_id UUID REFERENCES credit_cards(id),
    invoice_id UUID REFERENCES credit_card_invoices(id),
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELLED')),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('DAILY','WEEKLY','MONTHLY','YEARLY')),
    recurrence_interval INT,
    recurrence_end_date DATE,
    recurrence_group_id UUID,
    is_installment BOOLEAN NOT NULL DEFAULT FALSE,
    installment_number INT,
    installment_total INT,
    installment_group_id UUID,
    notes VARCHAR(1000),
    attachment_url VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tr_family ON transactions(family_group_id);
CREATE INDEX idx_tr_type ON transactions(type);
CREATE INDEX idx_tr_date ON transactions(transaction_date);
CREATE INDEX idx_tr_status ON transactions(status);
CREATE INDEX idx_tr_account ON transactions(account_id);
CREATE INDEX idx_tr_category ON transactions(category_id);
CREATE INDEX idx_tr_card ON transactions(credit_card_id);

CREATE TABLE transaction_tags (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE credit_card_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    purchase_date DATE NOT NULL,
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    is_installment BOOLEAN NOT NULL DEFAULT FALSE,
    installment_number INT,
    installment_total INT,
    installment_group_id UUID,
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ccp_card ON credit_card_purchases(credit_card_id);
CREATE INDEX idx_ccp_invoice ON credit_card_purchases(invoice_id);

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    planned_amount DECIMAL(15,2) NOT NULL,
    alert_at_percent INT DEFAULT 80,
    notes VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bud_family ON budgets(family_group_id);
CREATE INDEX idx_bud_period ON budgets(year, month);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);

CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('OPENAI','ANTHROPIC','GEMINI','OPENROUTER')),
    api_key_encrypted VARCHAR(1000) NOT NULL,
    model VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(family_group_id, provider)
);

CREATE TABLE bank_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('CSV','OFX','XLSX')),
    total_records INT DEFAULT 0,
    imported_records INT DEFAULT 0,
    skipped_records INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    error_message VARCHAR(1000),
    imported_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE bank_import_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_import_id UUID NOT NULL REFERENCES bank_imports(id) ON DELETE CASCADE,
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    description VARCHAR(255),
    amount DECIMAL(15,2),
    transaction_date DATE,
    type VARCHAR(10) CHECK (type IN ('INCOME','EXPENSE')),
    category_id UUID REFERENCES categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IMPORTED','SKIPPED','DUPLICATE')),
    transaction_id UUID REFERENCES transactions(id),
    ai_suggestions TEXT,
    raw_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tr_upd BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_bud_upd BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ais_upd BEFORE UPDATE ON ai_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_imp_upd BEFORE UPDATE ON bank_imports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_impitem_upd BEFORE UPDATE ON bank_import_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
