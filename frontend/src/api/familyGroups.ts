import apiClient from './client'
import type { FamilyGroup, FamilyInvite, BulkInviteResult, MemberRole } from '@/types'

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

  bulkInvite: (id: string, emails: string[], role: MemberRole) =>
    apiClient.post<BulkInviteResult>(`/family-groups/${id}/invite/bulk`, { emails, role }).then(r => r.data),

  listInvites: (id: string) =>
    apiClient.get<FamilyInvite[]>(`/family-groups/${id}/invites`).then(r => r.data),

  revokeInvite: (id: string, inviteId: string) =>
    apiClient.delete(`/family-groups/${id}/invites/${inviteId}`),

  changeMemberRole: (id: string, userId: string, role: MemberRole) =>
    apiClient.patch(`/family-groups/${id}/members/${userId}/role`, { role }),

  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/family-groups/${id}/members/${userId}`),
}
