package com.familyfinance.entity;

public enum PlanType {
    FREE(2, 2, 1, 50, 1, false, false, "Free", 0.0),
    ESSENCIAL(5, 10, 5, 500, 5, false, false, "Essencial", 14.90),
    PREMIUM(-1, -1, -1, -1, -1, true, true, "Premium", 29.90);

    private final int maxUsers;
    private final int maxAccounts;
    private final int maxCreditCards;
    private final int maxTransactionsPerMonth;
    private final int maxImportsPerMonth;
    private final boolean aiEnabled;
    private final boolean advancedReports;
    private final String displayName;
    private final double priceMonthly;

    PlanType(int maxUsers, int maxAccounts, int maxCreditCards,
             int maxTransactionsPerMonth, int maxImportsPerMonth,
             boolean aiEnabled, boolean advancedReports,
             String displayName, double priceMonthly) {
        this.maxUsers = maxUsers;
        this.maxAccounts = maxAccounts;
        this.maxCreditCards = maxCreditCards;
        this.maxTransactionsPerMonth = maxTransactionsPerMonth;
        this.maxImportsPerMonth = maxImportsPerMonth;
        this.aiEnabled = aiEnabled;
        this.advancedReports = advancedReports;
        this.displayName = displayName;
        this.priceMonthly = priceMonthly;
    }

    public int getMaxUsers() { return maxUsers; }
    public int getMaxAccounts() { return maxAccounts; }
    public int getMaxCreditCards() { return maxCreditCards; }
    public int getMaxTransactionsPerMonth() { return maxTransactionsPerMonth; }
    public int getMaxImportsPerMonth() { return maxImportsPerMonth; }
    public boolean isAiEnabled() { return aiEnabled; }
    public boolean isAdvancedReports() { return advancedReports; }
    public String getDisplayName() { return displayName; }
    public double getPriceMonthly() { return priceMonthly; }

    public boolean isUnlimited(int value) { return value == -1; }
}
