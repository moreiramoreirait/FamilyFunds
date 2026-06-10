import apiClient from './client'

export interface AdminGroupResponse {
  id: string
  name: string
  ownerEmail: string
  ownerName: string
  memberCount: number
  plan: 'FREE' | 'PRO' | 'BUSINESS'
  effectivePlan: 'FREE' | 'PRO' | 'BUSINESS'
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  trialEndDate: string | null
  createdAt: string
}

export interface AdminStatsResponse {
  totalGroups: number
  trialGroups: number
  activeProGroups: number
  activeBusinessGroups: number
  freeGroups: number
  expiredGroups: number
  totalUsers: number
  estimatedMRR: number
}

export const adminApi = {
  getGroups: () => apiClient.get<AdminGroupResponse[]>('/admin/groups').then(r => r.data),
  getStats: () => apiClient.get<AdminStatsResponse>('/admin/stats').then(r => r.data),
  forceChangePlan: (groupId: string, plan: string) =>
    apiClient.post(`/admin/groups/${groupId}/plan?plan=${plan}`).then(r => r.data),
}
