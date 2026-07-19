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

// خريطة العلاقات: كل مسار API يحدد القوائم اللي ممكن تتأثر بتعديله
// key = prefix المسار اللي اتعدّل، value = قائمة prefixes الكاش اللي لازم تتمسح
const INVALIDATION_MAP: Array<{ match: RegExp; invalidate: string[] }> = [
  // فواتير البيع → تؤثر على: الفواتير، العملاء (الرصيد)، المخزون، الأصناف (آخر سعر/التكلفة)
  { match: /^\/api\/sales\/invoices/, invalidate: ['/api/sales/invoices', '/api/customers', '/api/inventory', '/api/dashboard'] },
  // فواتير الشراء → تؤثر على: المشتريات، الموردين، المخزون، الأصناف، آخر سعر شراء
  { match: /^\/api\/purchases\/invoices/, invalidate: ['/api/purchases/invoices', '/api/suppliers', '/api/inventory', '/api/products', '/api/dashboard'] },
  // تحويلات المخزون → تؤثر على: المخزون، التحويلات
  { match: /^\/api\/transfers/, invalidate: ['/api/transfers', '/api/inventory'] },
  // مدفوعات العملاء → تؤثر على: المدفوعات، العملاء (الرصيد)، الخزائن
  { match: /^\/api\/payments\/customers/, invalidate: ['/api/payments/customers', '/api/customers', '/api/treasury', '/api/dashboard'] },
  // مدفوعات الموردين → تؤثر على: المدفوعات، الموردين (الرصيد)، الخزائن
  { match: /^\/api\/payments\/suppliers/, invalidate: ['/api/payments/suppliers', '/api/suppliers', '/api/treasury', '/api/dashboard'] },
  // العملاء → قائمة العملاء فقط
  { match: /^\/api\/customers/, invalidate: ['/api/customers', '/api/dashboard'] },
  // الموردين → قائمة الموردين فقط
  { match: /^\/api\/suppliers/, invalidate: ['/api/suppliers', '/api/dashboard'] },
  // الأصناف → قائمة الأصناف + المخزون
  { match: /^\/api\/products/, invalidate: ['/api/products', '/api/inventory'] },
  // المخزون → نفسه فقط
  { match: /^\/api\/inventory/, invalidate: ['/api/inventory'] },
  // المخازن → نفسها فقط
  { match: /^\/api\/stores/, invalidate: ['/api/stores'] },
  // الخزائن → نفسها + حركاتها
  { match: /^\/api\/treasury/, invalidate: ['/api/treasury', '/api/dashboard'] },
  // المصروفات → المصروفات + الخزائن
  { match: /^\/api\/expenses/, invalidate: ['/api/expenses', '/api/treasury', '/api/dashboard'] },
  // الشيكات → نفسها
  { match: /^\/api\/checks/, invalidate: ['/api/checks'] },
];

// مسح كاش كل المسارات اللي بتبدأ بأي من الـ prefixes المحددة
// (مثلاً لو عدّلنا عميل /api/customers/123، نمسح كل /api/customers?... )
function invalidateCacheFor(path: string) {
  for (const { match, invalidate } of INVALIDATION_MAP) {
    if (match.test(path)) {
      // امسح كل الـ cache keys اللي تطابق أي من الـ invalidation prefixes
      const keysToDelete: string[] = [];
      for (const k of sessionCache.keys()) {
        // نشيل الـ query string من الـ cache key عشان نقارن الـ path بس
        const cachePathOnly = k.split('?')[0];
        // نفحص لو الـ cache path بيبدأ بأي prefix من الـ invalidate list
        for (const prefix of invalidate) {
          if (cachePathOnly.startsWith(prefix)) {
            keysToDelete.push(k);
            break; // لقينا match، مش محتاجين نفحص باقي الـ prefixes
          }
        }
      }
      // امسح كل الـ keys اللي لقيناها
      for (const k of keysToDelete) {
        sessionCache.delete(k);
      }
      return;
    }
  }
  // fallback: مسح المسار نفسه + أي query variations
  for (const k of sessionCache.keys()) {
    if (k.split('?')[0] === path.split('?')[0]) {
      sessionCache.delete(k);
    }
  }
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
      const res = await fetch(path, { signal: controller.signal, cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errObj = json?.error;
        const msg = (typeof errObj === 'string' ? errObj : errObj?.message || errObj?.code) || `HTTP ${res.status}`;
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
    // عند POST/PATCH/DELETE: نمسح كاش المسارات المرتبطة بذكاء
    if (method !== 'GET') {
      invalidateCacheFor(path);
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
        const errObj = json?.error;
        const msg = (typeof errObj === 'string' ? errObj : errObj?.message || errObj?.code) || `HTTP ${res.status}`;
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
