import apiClient from './client'
import type { FamilyGroup } from '@/types'

export const familyGroupsApi = {
  list: () =>
    apiClient.get<FamilyGroup[]>('/family-groups').then(r => r.data),

  getById: (id: string) =>
    apiClient.get<FamilyGroup>(`/family-groups/${id}`).then(r => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<FamilyGroup>('/family-groups', data).then(r => r.data),

  update: (id: string, data: { name: string; description?: string }) =>
    apiClient.put<FamilyGroup>(`/family-groups/${id}`, data).then(r => r.data),

  invite: (id: string, data: { email: string; role: string }) =>
    apiClient.post(`/family-groups/${id}/invite`, data),

  acceptInvite: (token: string) =>
    apiClient.post(`/family-groups/invites/${token}/accept`),
}
