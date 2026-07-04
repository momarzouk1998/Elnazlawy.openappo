'use client'

import { useEffect } from 'react'
import { hydrateUserFromSSR, useUserStore } from '@/store/user-store'
import type { CurrentProfile } from '@/lib/auth'

/**
 * Hydrates the user store from SSR data passed by RootLayout.
 *
 * Critical: when `initialUser` is provided, we call `hydrateUserFromSSR()`
 * synchronously during render. This is safe because:
 *   1. `hydrateUserFromSSR` is a no-op on subsequent calls (idempotent).
 *   2. Zustand `setState` is an external store update — React doesn't
 *      consider it a state change of the current component, so it doesn't
 *      trigger the "cannot update during render" warning.
 *   3. Sibling/child components rendered in the SAME React commit
 *      see the user immediately — no blank-page race.
 *
 * When no SSR data is provided, we fall back to a client-side fetch
 * inside useEffect (only relevant during HMR or edge cases where
 * RootLayout didn't pass data).
 */
export function UserInitializer({ initialUser }: { initialUser?: CurrentProfile | null }) {
  // Always call the same hook order — pass a flag inside the hook.
  useBootstrap(initialUser)
  return null
}

function useBootstrap(initialUser: CurrentProfile | null | undefined) {
  const setUser = useUserStore((s) => s.setUser)
  const initialized = useUserStore((s) => s.initialized)

  // Synchronous SSR hydration — runs on first render, no-op afterwards.
  if (initialUser !== undefined) {
    hydrateUserFromSSR(initialUser)
  }

  // Fallback: refresh from the server if we don't have SSR data.
  useEffect(() => {
    if (initialUser !== undefined) return // already hydrated above
    if (initialized) return
    let cancelled = false
    fetch('/api/auth/user')
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setUser(null)
          return
        }
        const json = await res.json()
        setUser(json.data as CurrentProfile)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
