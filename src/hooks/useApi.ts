'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// مخزن مؤقت في الذاكرة (داخل الجلسة) — يمنع fetch مكرر لنفس الرابط في نفس التحميل
const sessionCache = new Map<string, { data: any; ts: number }>();
const SESSION_TTL_MS = 30_000; // 30 ثانية — كافٍ لمنع الازدواج

function getCached<T>(path: string): T | null {
  const c = sessionCache.get(path);
  if (!c) return null;
  if (Date.now() - c.ts > SESSION_TTL_MS) {
    sessionCache.delete(path);
    return null;
  }
  return c.data as T;
}

function setCached(path: string, data: any) {
  sessionCache.set(path, { data, ts: Date.now() });
}

export function useApi<T>(path: string | null) {
  // عرض البيانات المخزنة فوراً (لتجنب وميض "جاري التحميل")
  const initialData = path ? getCached<T>(path) : null;
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: !!path && !initialData,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (useCache = true) => {
    if (!path) return
    // لو عندنا بيانات حديثة، اعرضها فوراً وأعد التحقق في الخلفية
    if (useCache) {
      const c = getCached<T>(path);
      if (c) {
        setState({ data: c, loading: false, error: null });
        // stale-while-revalidate: نكمل بالخلفية بدون إظهار spinner
        // (لكن لو عمر البيانات > 10 ثواني، نعيد التحميل مع spinner)
        if (Date.now() - (sessionCache.get(path)?.ts || 0) < 10_000) {
          // كاش طازج — لا نعمل شيء
          return c;
        }
      }
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(path, { signal: controller.signal })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json?.error?.message || json?.error || `HTTP ${res.status}`
        throw new Error(msg)
      }
      const data = json.data !== undefined ? json.data : json
      if (!controller.signal.aborted) {
        setCached(path, data);
        setState({ data, loading: false, error: null })
      }
      return data
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      if (!controller.signal.aborted) {
        setState((prev) => ({ ...prev, loading: false, error: message }))
      }
      return null
    }
  }, [path])

  useEffect(() => {
    if (path) fetchData()
    return () => { abortRef.current?.abort() }
  }, [fetchData, path])

  return { ...state, refetch: () => fetchData(false) }
}

export function useApiMutation() {
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const mutate = useCallback(async <T = any>(method: string, path: string, body?: unknown): Promise<{ error: string | null; data: T | null }> => {
    // عند POST/PATCH/DELETE: نمسح الكاش الخاص بمسار GET المشابه
    if (method !== 'GET') {
      // مسح كاش المسار نفسه
      sessionCache.delete(path);
      // مسح كاش القوائم التي قد تتأثر (best-effort heuristic)
      if (path.startsWith('/api/sales/invoices')) {
        for (const k of sessionCache.keys()) {
          if (k.startsWith('/api/sales/invoices') || k.startsWith('/api/customers') || k.startsWith('/api/inventory') || k.startsWith('/api/products')) {
            sessionCache.delete(k);
          }
        }
      } else if (path.startsWith('/api/purchases/invoices')) {
        for (const k of sessionCache.keys()) {
          if (k.startsWith('/api/purchases/invoices') || k.startsWith('/api/suppliers') || k.startsWith('/api/inventory') || k.startsWith('/api/products')) {
            sessionCache.delete(k);
          }
        }
      } else if (path.startsWith('/api/checks')) {
        for (const k of sessionCache.keys()) {
          if (k.startsWith('/api/checks')) sessionCache.delete(k);
        }
      } else if (path.startsWith('/api/customers') || path.startsWith('/api/products') || path.startsWith('/api/inventory') || path.startsWith('/api/stores') || path.startsWith('/api/treasury') || path.startsWith('/api/suppliers')) {
        sessionCache.delete(path);
      }
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json?.error?.message || json?.error || `HTTP ${res.status}`
        return { error: msg, data: null }
      }
      return { error: null, data: json.data !== undefined ? json.data : json }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return { error: null, data: null }
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      return { error: message, data: null }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])
  return { mutate, loading }
}
