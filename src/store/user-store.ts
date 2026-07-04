'use client'

import { useState, useEffect, useRef } from 'react'
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
 * - Hydrated from SSR via `setInitialUser()` (see UserInitializer)
 * - Falls back to a client-side /api/auth/user fetch when no SSR data
 * - Cleared on logout
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  initialized: false,

  setUser: (user) => set({ user, initialized: true }),

  logout: () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    set({ user: null, initialized: true })
  },
}))

/**
 * One-shot helper: hydrate the store with SSR-supplied user data.
 * Safe to call from a client component's render path because it only
 * sets the state once (subsequent calls are no-ops).
 *
 * Returns `true` if the store was just hydrated, `false` if it was
 * already initialized. Components can use this to decide whether to
 * block render until the first client-side fetch completes.
 */
let ssrHydrated = false
export function hydrateUserFromSSR(user: CurrentProfile | null): boolean {
  if (ssrHydrated) return false
  ssrHydrated = true
  useUserStore.setState({ user, initialized: true })
  return true
}
