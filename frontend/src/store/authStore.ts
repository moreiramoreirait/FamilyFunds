import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  currentGroupId: string | null

  setAuth: (user: User, token: string, refreshToken: string) => void
  setCurrentGroup: (groupId: string) => void
  updateUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      currentGroupId: null,

      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      setCurrentGroup: (groupId) =>
        set({ currentGroupId: groupId }),

      updateUser: (user) => set({ user }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, currentGroupId: null }),
    }),
    {
      name: 'family-finance-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        currentGroupId: state.currentGroupId,
      }),
    }
  )
)
