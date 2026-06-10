import apiClient from './client'

export interface Budget {
  id: string
  categoryId: string | null
  categoryName: string
  categoryColor: string | null
  amount: number
  spent: number
  remaining: number
  percentage: number
  month: number
  year: number
  alertPercentage: number
  alertTriggered: boolean
}

export interface BudgetPayload {
  categoryId?: string
  amount: number
  month: number
  year: number
  alertPercentage?: number
}

export const budgetsApi = {
  list: (groupId: string, month: number, year: number) =>
    apiClient.get<Budget[]>(`/family-groups/${groupId}/budgets`, { params: { month, year } }).then(r => r.data),

  create: (groupId: string, data: BudgetPayload) =>
    apiClient.post<Budget>(`/family-groups/${groupId}/budgets`, data).then(r => r.data),

  update: (groupId: string, id: string, data: BudgetPayload) =>
    apiClient.put<Budget>(`/family-groups/${groupId}/budgets/${id}`, data).then(r => r.data),

  delete: (groupId: string, id: string) =>
    apiClient.delete(`/family-groups/${groupId}/budgets/${id}`),
}
