'use client'

import { create } from 'zustand'
import type { CurrentProfile } from '@/lib/auth'

interface UserState {
  user: CurrentProfile | null
  initialized: boolean
  setUser: (user: CurrentProfile | null) => void
  logout: () => void
}

/**
 * Central user store.
 * - Set on app load from /api/auth/user
 * - Cleared on logout
 * - Used by sidebar, header, permissions checks
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  initialized: false,

  setUser: (user) => set({ user, initialized: true }),

  logout: () => {
    // Fire-and-forget: clear cookie server-side
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    set({ user: null, initialized: true })
  },
}))
