import apiClient from './client'

export interface Subscription {
  id: string
  familyGroupId: string
  plan: 'FREE' | 'PRO' | 'BUSINESS'
  effectivePlan: 'FREE' | 'PRO' | 'BUSINESS'
  status: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  trialEndDate: string | null
  trialDaysLeft: number
  trialActive: boolean
  currentPeriodEnd: string | null
  maxUsers: number
  maxAccounts: number
  maxCreditCards: number
  maxTransactionsPerMonth: number
  maxImportsPerMonth: number
  aiEnabled: boolean
  advancedReports: boolean
  displayName: string
  priceMonthly: number
}

export interface Plan {
  type: 'FREE' | 'PRO' | 'BUSINESS'
  displayName: string
  priceMonthly: number
  maxUsers: number
  maxAccounts: number
  maxCreditCards: number
  maxTransactionsPerMonth: number
  maxImportsPerMonth: number
  aiEnabled: boolean
  advancedReports: boolean
  features: string[]
}

export const subscriptionsApi = {
  getSubscription: (groupId: string) =>
    apiClient.get<Subscription>(`/family-groups/${groupId}/subscription`).then(r => r.data),

  upgrade: (groupId: string, plan: string) =>
    apiClient.post<Subscription>(`/family-groups/${groupId}/subscription/upgrade?plan=${plan}`).then(r => r.data),

  cancel: (groupId: string) =>
    apiClient.post<Subscription>(`/family-groups/${groupId}/subscription/cancel`).then(r => r.data),

  listPlans: () =>
    apiClient.get<Plan[]>('/plans').then(r => r.data),
}
