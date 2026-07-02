import apiClient from './client'
import type { Category, Subcategory } from '@/types'

export const categoriesApi = {
  list: (groupId: string) =>
    apiClient.get<Category[]>(`/family-groups/${groupId}/categories`).then(r => r.data),

  create: (groupId: string, data: { name: string; type: string; color?: string; icon?: string }) =>
    apiClient.post<Category>(`/family-groups/${groupId}/categories`, data).then(r => r.data),

  update: (groupId: string, id: string, data: { name: string; type: string; color?: string; icon?: string }) =>
    apiClient.put<Category>(`/family-groups/${groupId}/categories/${id}`, data).then(r => r.data),

  delete: (groupId: string, id: string) =>
    apiClient.delete(`/family-groups/${groupId}/categories/${id}`),

  createSubcategory: (groupId: string, categoryId: string, data: { name: string }) =>
    apiClient.post<Subcategory>(`/family-groups/${groupId}/categories/${categoryId}/subcategories`, data).then(r => r.data),

  updateSubcategory: (groupId: string, categoryId: string, subcategoryId: string, data: { name: string }) =>
    apiClient.put<Subcategory>(`/family-groups/${groupId}/categories/${categoryId}/subcategories/${subcategoryId}`, data).then(r => r.data),

  deleteSubcategory: (groupId: string, categoryId: string, subcategoryId: string) =>
    apiClient.delete(`/family-groups/${groupId}/categories/${categoryId}/subcategories/${subcategoryId}`),
}
