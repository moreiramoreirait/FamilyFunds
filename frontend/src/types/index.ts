// ============ AUTH ============
export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  phone?: string
  emailVerified: boolean
  createdAt: string
  isSystemAdmin?: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: User
}

// ============ FAMILY GROUP ============
export type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER'

export interface FamilyGroupMember {
  userId: string
  userName: string
  userEmail: string
  userAvatarUrl?: string
  role: MemberRole
  joinedAt: string
}

export interface FamilyGroup {
  id: string
  name: string
  description?: string
  avatarUrl?: string
  isActive: boolean
  currentUserRole: MemberRole
  members: FamilyGroupMember[]
  createdAt: string
}

// ============ ACCOUNT ============
export type AccountType = 'CHECKING' | 'SAVINGS' | 'WALLET' | 'CASH' | 'INVESTMENT' | 'OTHER'

export interface Account {
  id: string
  name: string
  bankName?: string
  type: AccountType
  initialBalance: number
  currentBalance: number
  color?: string
  icon?: string
  isActive: boolean
  includeInTotal: boolean
  notes?: string
  createdAt: string
}

// ============ CATEGORY ============
export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH'

export interface Subcategory {
  id: string
  categoryId: string
  name: string
  color?: string
  icon?: string
  isActive: boolean
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  color?: string
  icon?: string
  isActive: boolean
  isSystem: boolean
  subcategories: Subcategory[]
}

// ============ TRANSACTION ============
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
export type TransactionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface Tag {
  id: string
  name: string
  color?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  description: string
  amount: number
  transactionDate: string
  dueDate?: string
  paidDate?: string
  accountId?: string
  accountName?: string
  creditCardId?: string
  creditCardName?: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  subcategoryId?: string
  subcategoryName?: string
  costCenterId?: string
  costCenterName?: string
  status: TransactionStatus
  isRecurring: boolean
  recurrenceType?: RecurrenceType
  isInstallment: boolean
  installmentNumber?: number
  installmentTotal?: number
  installmentGroupId?: string
  notes?: string
  attachmentUrl?: string
  tags: Tag[]
  createdAt: string
}

export interface TransactionPage {
  content: Transaction[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

// ============ DASHBOARD ============
export interface CategoryExpenseItem {
  categoryId: string
  categoryName: string
  color?: string
  amount: number
  percentage: number
}

export interface MonthlyEvolutionItem {
  month: string
  income: number
  expense: number
  balance: number
}

export interface DashboardData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyResult: number
  totalCreditCardsOutstanding: number
  overdueCount: number
  dueSoonCount: number
  savingsAmount: number
  budgetConsumedPercent: number
  expensesByCategory: CategoryExpenseItem[]
  monthlyEvolution: MonthlyEvolutionItem[]
  recentTransactions: Transaction[]
  upcomingDue: Transaction[]
  totalMonthlySubscriptions: number
  totalMonthlyRecurringExpenses: number
  upcomingRecurringChargesCount: number
  recurringPercentOfIncome: number
}

// ============ CREDIT CARD ============
export interface CreditCard {
  id: string
  name: string
  bankName?: string
  brand?: string
  lastFourDigits?: string
  creditLimit: number
  availableLimit: number
  closingDay: number
  dueDay: number
  color?: string
  icon?: string
  isActive: boolean
}

export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE'

export interface CreditCardInvoice {
  id: string
  creditCardId: string
  referenceMonth: number
  referenceYear: number
  closingDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
}

// ============ SERVICE SUBSCRIPTION ============
export type ServiceSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

export interface ServiceSubscription {
  id: string
  name: string
  description?: string
  amount: number
  billingDay?: number
  startDate?: string
  endDate?: string
  status: ServiceSubscriptionStatus
  categoryId?: string
  categoryName?: string
  costCenterId?: string
  costCenterName?: string
  paymentAccountId?: string
  paymentAccountName?: string
  creditCardId?: string
  creditCardName?: string
  paymentMethod?: string
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextChargeDate?: string
  createdAt: string
}

export interface ServiceSubscriptionSummary {
  activeCount: number
  pausedCount: number
  monthlyTotal: number
  nextChargeDate?: string
  nextChargeName?: string
  nextChargeAmount?: number
}

// ============ RECURRING EXPENSE ============
export type RecurringExpenseStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

export interface RecurringExpense {
  id: string
  description: string
  amount: number
  dueDay?: number
  startDate?: string
  endDate?: string
  status: RecurringExpenseStatus
  categoryId?: string
  categoryName?: string
  costCenterId?: string
  costCenterName?: string
  paymentAccountId?: string
  paymentAccountName?: string
  paymentMethod?: string
  recurrenceType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY'
  autoGenerate: boolean
  nextDueDate?: string
  createdAt: string
}

export interface RecurringExpenseSummary {
  activeCount: number
  pausedCount: number
  monthlyTotal: number
  nextDueDate?: string
  nextDueDescription?: string
  nextDueAmount?: number
}

// ============ SMART SHOPPING ============
export type ShoppingSourceType = 'QR_CODE' | 'NFC_URL' | 'MANUAL' | 'SHOPPING_LIST'
export type PurchaseStatus = 'RASCUNHO' | 'FINALIZADA' | 'LANCADA_NO_FINANCEIRO' | 'CANCELADA'
export type ExtractionStatus = 'IMPORTADO_COM_SUCESSO' | 'IMPORTADO_PARCIALMENTE' | 'FALHA_NA_IMPORTACAO'
export type ShoppingListStatus = 'ABERTA' | 'EM_COMPRA' | 'FINALIZADA' | 'CONVERTIDA_EM_COMPRA' | 'CANCELADA'

export interface ShoppingPurchaseItem {
  id: string
  productName: string
  category?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  totalPrice?: number
  brand?: string
  productCode?: string
}

export interface ShoppingPurchase {
  id: string
  storeName: string
  storeCnpj?: string
  purchaseDate: string
  totalAmount?: number
  paymentMethod?: string
  accountId?: string
  accountName?: string
  creditCardId?: string
  creditCardName?: string
  categoryId?: string
  categoryName?: string
  sourceType: ShoppingSourceType
  qrCodeUrl?: string
  accessKey?: string
  extractionStatus?: ExtractionStatus
  extractionError?: string
  financialTransactionId?: string
  status: PurchaseStatus
  notes?: string
  items: ShoppingPurchaseItem[]
  createdAt: string
}

export interface ShoppingSummary {
  monthTotal: number
  monthPurchaseCount: number
  lastPurchaseDate?: string
  lastPurchaseStore?: string
  lastPurchaseAmount?: number
  trackedProducts: number
}

export interface PriceHistoryEntry {
  unitPrice: number
  quantity?: number
  unit?: string
  storeName?: string
  purchaseDate: string
}

export interface PriceHistory {
  normalizedProductName: string
  productName: string
  lastPrice?: number
  minPrice?: number
  maxPrice?: number
  lastStoreName?: string
  lastPurchaseDate?: string
  records: number
  history: PriceHistoryEntry[]
}

export interface ShoppingListItem {
  id: string
  productName: string
  category?: string
  quantity?: number
  unit?: string
  estimatedUnitPrice?: number
  estimatedTotalPrice?: number
  lastPaidPrice?: number
  preferredStore?: string
  checked: boolean
  realUnitPrice?: number
  realTotalPrice?: number
}

export interface ShoppingList {
  id: string
  name: string
  description?: string
  status: ShoppingListStatus
  estimatedTotal?: number
  convertedPurchaseId?: string
  items: ShoppingListItem[]
  createdAt: string
}

// ============ COST CENTER ============
export interface CostCenter {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
}

// ============ NOTIFICATION ============
export interface Notification {
  id: string
  type: string
  title: string
  message?: string
  isRead: boolean
  createdAt: string
}

// ============ API ERROR ============
export interface ApiError {
  status: number
  message: string
  timestamp: string
  errors?: { field: string; message: string }[]
}

// ============ PAGINATION ============
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}
