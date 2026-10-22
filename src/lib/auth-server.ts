// Server-only auth helpers
import { cache } from 'react';
import { cookies } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { COOKIE_NAME, verifySession } from '@/lib/db/auth';
import type { CurrentProfile, UserRole } from '@/lib/auth';

// كاش قصير المدى (5 ثوانٍ) لتجنب استعلام قاعدة البيانات المتكرر مع كل طلب API متزامن
const userProfileCache = new Map<string | number, { profile: CurrentProfile; ts: number }>();
const USER_CACHE_TTL_MS = 5_000;

export const getCurrentUser = cache(async (): Promise<CurrentProfile | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifySession(token);
    if (!payload) return null;

    const cached = userProfileCache.get(payload.sub);
    if (cached && Date.now() - cached.ts < USER_CACHE_TTL_MS) {
      return cached.profile;
    }

    const user = await prisma.users.findFirst({
      where: { id: payload.sub, is_active: true },
      select: {
        id: true, username: true, full_name: true, phone: true, role: true,
        can_see_cost: true, is_active: true,
      },
    });
    if (!user) {
      userProfileCache.delete(payload.sub);
      return null;
    }
    const profile: CurrentProfile = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone || null,
      role: user.role as UserRole,
      can_see_cost: user.can_see_cost,
      is_active: user.is_active,
    };
    userProfileCache.set(payload.sub, { profile, ts: Date.now() });
    return profile;
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<CurrentProfile> {
  const u = await getCurrentUser();
  if (!u) throw new Error('UNAUTHORIZED');
  return u;
}

export async function requireAdmin(): Promise<CurrentProfile> {
  const u = await requireUser();
  if (u.role !== 'admin') throw new Error('FORBIDDEN');
  return u;
}
