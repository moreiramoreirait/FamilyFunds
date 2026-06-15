import apiClient from './client'
import type { Notification } from '@/types'

const base = (groupId: string) => `/family-groups/${groupId}/notifications`

export const notificationsApi = {
  list: (groupId: string) =>
    apiClient.get<Notification[]>(base(groupId)).then(r => r.data),

  unread: (groupId: string) =>
    apiClient.get<Notification[]>(`${base(groupId)}/unread`).then(r => r.data),

  unreadCount: (groupId: string) =>
    apiClient.get<{ count: number }>(`${base(groupId)}/unread/count`).then(r => r.data.count),

  markRead: (groupId: string, id: string) =>
    apiClient.patch(`${base(groupId)}/${id}/read`).then(r => r.data),

  markAllRead: (groupId: string) =>
    apiClient.patch(`${base(groupId)}/read-all`).then(r => r.data),
}
