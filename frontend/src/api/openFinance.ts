import apiClient from './client'
import type { BankConnection } from '@/types'

const base = (groupId: string) => `/family-groups/${groupId}/open-finance`

export const openFinanceApi = {
  connectToken: (groupId: string) =>
    apiClient.post<{ accessToken: string }>(`${base(groupId)}/connect-token`).then(r => r.data.accessToken),

  saveConnection: (groupId: string, itemId: string) =>
    apiClient.post<BankConnection>(`${base(groupId)}/connections`, { itemId }).then(r => r.data),

  list: (groupId: string) =>
    apiClient.get<BankConnection[]>(`${base(groupId)}/connections`).then(r => r.data),

  remove: (groupId: string, id: string) =>
    apiClient.delete(`${base(groupId)}/connections/${id}`),
}
