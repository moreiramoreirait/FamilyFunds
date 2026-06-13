import apiClient from './client'
import type { ServiceSubscription, ServiceSubscriptionSummary } from '@/types'

export interface ServiceSubscriptionPayload {
  name: string
  description?: string
  amount: number
  billingDay?: number
  startDate?: string
  endDate?: string
  categoryId?: string
  costCenterId?: string
  paymentAccountId?: string
  creditCardId?: string
  paymentMethod?: string
  recurrenceType: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'DAILY'
}

const base = (groupId: string) => `/family-groups/${groupId}/service-subscriptions`

export const serviceSubscriptionsApi = {
  list: (groupId: string) =>
    apiClient.get<ServiceSubscription[]>(base(groupId)).then(r => r.data),

  summary: (groupId: string) =>
    apiClient.get<ServiceSubscriptionSummary>(`${base(groupId)}/summary`).then(r => r.data),

  get: (groupId: string, id: string) =>
    apiClient.get<ServiceSubscription>(`${base(groupId)}/${id}`).then(r => r.data),

  create: (groupId: string, data: ServiceSubscriptionPayload) =>
    apiClient.post<ServiceSubscription>(base(groupId), data).then(r => r.data),

  update: (groupId: string, id: string, data: ServiceSubscriptionPayload) =>
    apiClient.put<ServiceSubscription>(`${base(groupId)}/${id}`, data).then(r => r.data),

  pause: (groupId: string, id: string) =>
    apiClient.patch<ServiceSubscription>(`${base(groupId)}/${id}/pause`).then(r => r.data),

  cancel: (groupId: string, id: string) =>
    apiClient.patch<ServiceSubscription>(`${base(groupId)}/${id}/cancel`).then(r => r.data),

  activate: (groupId: string, id: string) =>
    apiClient.patch<ServiceSubscription>(`${base(groupId)}/${id}/activate`).then(r => r.data),

  generate: (groupId: string) =>
    apiClient.post<{ created: number }>(`${base(groupId)}/generate`).then(r => r.data),
}
