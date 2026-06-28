'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/store/user-store'
import type { CurrentProfile } from '@/lib/auth'

/**
 * Fetches the current user from /api/auth/user on app mount
 * and sets it in the Zustand store.
 * Place once in the root layout.
 */
export function UserInitializer() {
  const { setUser, initialized } = useUserStore()

  useEffect(() => {
    if (initialized) return

    fetch('/api/auth/user')
      .then(async (res) => {
        if (!res.ok) {
          // Not authenticated — that's fine, let middleware handle redirect
          setUser(null)
          return
        }
        const json = await res.json()
        const user: CurrentProfile = json.data
        setUser(user)
      })
      .catch(() => {
        setUser(null)
      })
  }, [initialized, setUser])

  return null
}
