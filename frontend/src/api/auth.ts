import apiClient from './client'
import type { AuthResponse } from '@/types'

export interface LoginData { email: string; password: string }
export interface RegisterData { name: string; email: string; password: string }

export const authApi = {
  login: (data: LoginData) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: RegisterData) =>
    apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),

  me: () =>
    apiClient.get('/users/me').then(r => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
}
