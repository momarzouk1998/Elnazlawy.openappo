import type { CurrentProfile } from '@/lib/auth';

let profileMemoryCache: { profile: CurrentProfile | null; timestamp: number } | null = null;
let profileInFlightPromise: Promise<CurrentProfile | null> | null = null;

const CACHE_KEY = 'openappo_profile_cache_elnazlawy_v1';

/**
 * جلب سريع وفوري لبيانات المستخدم من الذاكرة أو localStorage (0ms)
 * لمنع وميض التحميل أو تغير الـ Layout
 */
export function peekProfile(): { user: CurrentProfile | null } | null {
  if (profileMemoryCache?.profile) {
    return { user: profileMemoryCache.profile };
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.profile) {
          profileMemoryCache = { profile: parsed.profile, timestamp: parsed.timestamp || Date.now() };
          return { user: parsed.profile };
        }
      }
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }
  return null;
}

/**
 * جلب بيانات المستخدم مع كاش ذكي (افتراضياً 60 ثانية)
 * يمنع تكرار الطلبات المتوازية عبر inFlight deduplication
 */
export async function getProfile(maxAgeMs: number = 60_000): Promise<CurrentProfile | null> {
  const now = Date.now();
  if (profileMemoryCache?.profile && now - profileMemoryCache.timestamp < maxAgeMs) {
    return profileMemoryCache.profile;
  }

  if (profileInFlightPromise) {
    return profileInFlightPromise;
  }

  profileInFlightPromise = (async () => {
    try {
      const res = await fetch('/api/auth/user', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) {
        if (res.status === 401) {
          clearProfileCache();
        }
        return null;
      }
      const json = await res.json();
      const profile: CurrentProfile | null = json?.data || null;
      profileMemoryCache = { profile, timestamp: Date.now() };
      if (typeof window !== 'undefined' && profile) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(profileMemoryCache));
        } catch {
          // تجاهل أخطاء التخزين المحلي
        }
      }
      return profile;
    } catch (e) {
      console.error('[profileCache] Failed to fetch profile:', e);
      return profileMemoryCache?.profile || null;
    } finally {
      profileInFlightPromise = null;
    }
  })();

  return profileInFlightPromise;
}

/**
 * مسح كاش المستخدم عند تسجيل الخروج
 */
export function clearProfileCache(): void {
  profileMemoryCache = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // تجاهل
    }
  }
}
