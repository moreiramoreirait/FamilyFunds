UPDATE subscriptions SET plan_type = 'ESSENCIAL' WHERE plan_type = 'PRO';
UPDATE subscriptions SET plan_type = 'PREMIUM' WHERE plan_type = 'BUSINESS';
