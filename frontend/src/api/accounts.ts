import apiClient from './client'
import type { Account, AccountType } from '@/types'

export interface AccountPayload {
  name: string
  bankName?: string
  type: AccountType
  initialBalance?: number
  color?: string
  icon?: string
  includeInTotal?: boolean
  notes?: string
}

export const accountsApi = {
  list: (groupId: string) =>
    apiClient.get<Account[]>(`/family-groups/${groupId}/accounts`).then(r => r.data),

  getById: (groupId: string, id: string) =>
    apiClient.get<Account>(`/family-groups/${groupId}/accounts/${id}`).then(r => r.data),

  create: (groupId: string, data: AccountPayload) =>
    apiClient.post<Account>(`/family-groups/${groupId}/accounts`, data).then(r => r.data),

  update: (groupId: string, id: string, data: AccountPayload) =>
    apiClient.put<Account>(`/family-groups/${groupId}/accounts/${id}`, data).then(r => r.data),

  delete: (groupId: string, id: string) =>
    apiClient.delete(`/family-groups/${groupId}/accounts/${id}`),
}
