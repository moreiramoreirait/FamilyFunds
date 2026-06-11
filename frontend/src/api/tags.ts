import apiClient from './client'
import type { Tag } from '@/types'

export const tagsApi = {
  list: (groupId: string) =>
    apiClient.get<Tag[]>(`/family-groups/${groupId}/tags`).then(r => r.data),

  create: (groupId: string, data: { name: string; color?: string }) =>
    apiClient.post<Tag>(`/family-groups/${groupId}/tags`, data).then(r => r.data),

  update: (groupId: string, id: string, data: { name: string; color?: string }) =>
    apiClient.put<Tag>(`/family-groups/${groupId}/tags/${id}`, data).then(r => r.data),

  delete: (groupId: string, id: string) =>
    apiClient.delete(`/family-groups/${groupId}/tags/${id}`),
}
