package com.familyfinance.entity;

/**
 * Origem de um lançamento (transaction).
 * MANUAL: criado manualmente pelo usuário.
 * SUBSCRIPTION: gerado por uma assinatura de serviço (service_subscriptions).
 * RECURRING_EXPENSE: gerado por uma despesa recorrente (recurring_expenses).
 */
public enum OriginType {
    MANUAL,
    SUBSCRIPTION,
    RECURRING_EXPENSE,
    SHOPPING_PURCHASE
}
