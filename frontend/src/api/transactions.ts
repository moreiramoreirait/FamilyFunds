import apiClient from './client'
import type { Transaction, TransactionPage } from '@/types'

export interface TransactionPayload {
  type: string
  description: string
  amount: number
  transactionDate: string
  dueDate?: string
  paidDate?: string
  accountId?: string
  categoryId?: string
  subcategoryId?: string
  costCenterId?: string
  creditCardId?: string
  status?: string
  isRecurring?: boolean
  recurrenceType?: string
  recurrenceInterval?: number
  recurrenceEndDate?: string
  isInstallment?: boolean
  installmentTotal?: number
  installmentCount?: number
  notes?: string
  tagIds?: string[]
}

export const transactionsApi = {
  list: (groupId: string, page = 0, size = 20) =>
    apiClient.get<TransactionPage>(`/family-groups/${groupId}/transactions`, { params: { page, size } }).then(r => r.data),

  getById: (groupId: string, id: string) =>
    apiClient.get<Transaction>(`/family-groups/${groupId}/transactions/${id}`).then(r => r.data),

  create: (groupId: string, data: TransactionPayload) =>
    apiClient.post<Transaction>(`/family-groups/${groupId}/transactions`, data).then(r => r.data),

  createInstallments: (groupId: string, data: TransactionPayload) =>
    apiClient.post<Transaction[]>(`/family-groups/${groupId}/transactions/installments`, data).then(r => r.data),

  update: (groupId: string, id: string, data: TransactionPayload) =>
    apiClient.put<Transaction>(`/family-groups/${groupId}/transactions/${id}`, data).then(r => r.data),

  markAsPaid: (groupId: string, id: string, paidDate?: string) =>
    apiClient.patch<Transaction>(`/family-groups/${groupId}/transactions/${id}/pay`, null, { params: paidDate ? { paidDate } : {} }).then(r => r.data),

  delete: (groupId: string, id: string) =>
    apiClient.delete(`/family-groups/${groupId}/transactions/${id}`),
}
