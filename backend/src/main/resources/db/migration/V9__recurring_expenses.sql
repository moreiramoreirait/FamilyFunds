-- Despesas recorrentes (aluguel, internet, energia, água, escola, ...)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    description VARCHAR(160) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    due_day INT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    category_id UUID REFERENCES categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    payment_account_id UUID REFERENCES accounts(id),
    payment_method VARCHAR(30),
    recurrence_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    auto_generate BOOLEAN NOT NULL DEFAULT TRUE,
    next_due_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_exp_group ON recurring_expenses (family_group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_exp_status ON recurring_expenses (status);
