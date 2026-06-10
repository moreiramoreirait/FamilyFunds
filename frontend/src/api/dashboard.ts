import apiClient from './client'
import type { DashboardData } from '@/types'

export const dashboardApi = {
  get: (groupId: string) =>
    apiClient.get<DashboardData>(`/family-groups/${groupId}/dashboard`).then(r => r.data),
}
