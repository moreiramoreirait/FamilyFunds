import apiClient from './client'
import type { RecurringExpense, RecurringExpenseSummary } from '@/types'

export interface RecurringExpensePayload {
  description: string
  amount: number
  dueDay?: number
  startDate?: string
  endDate?: string
  categoryId?: string
  costCenterId?: string
  paymentAccountId?: string
  paymentMethod?: string
  recurrenceType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY' | 'DAILY'
  autoGenerate?: boolean
}

const base = (groupId: string) => `/family-groups/${groupId}/recurring-expenses`

export const recurringExpensesApi = {
  list: (groupId: string) =>
    apiClient.get<RecurringExpense[]>(base(groupId)).then(r => r.data),

  summary: (groupId: string) =>
    apiClient.get<RecurringExpenseSummary>(`${base(groupId)}/summary`).then(r => r.data),

  get: (groupId: string, id: string) =>
    apiClient.get<RecurringExpense>(`${base(groupId)}/${id}`).then(r => r.data),

  create: (groupId: string, data: RecurringExpensePayload) =>
    apiClient.post<RecurringExpense>(base(groupId), data).then(r => r.data),

  update: (groupId: string, id: string, data: RecurringExpensePayload) =>
    apiClient.put<RecurringExpense>(`${base(groupId)}/${id}`, data).then(r => r.data),

  pause: (groupId: string, id: string) =>
    apiClient.patch<RecurringExpense>(`${base(groupId)}/${id}/pause`).then(r => r.data),

  cancel: (groupId: string, id: string) =>
    apiClient.patch<RecurringExpense>(`${base(groupId)}/${id}/cancel`).then(r => r.data),

  activate: (groupId: string, id: string) =>
    apiClient.patch<RecurringExpense>(`${base(groupId)}/${id}/activate`).then(r => r.data),

  generate: (groupId: string) =>
    apiClient.post<{ created: number }>(`${base(groupId)}/generate`).then(r => r.data),
}
