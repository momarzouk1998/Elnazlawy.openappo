'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA install + offline support.
 * Kept separate so RootLayout can stay a server component.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silently ignore — SW is a progressive enhancement.
      })
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
