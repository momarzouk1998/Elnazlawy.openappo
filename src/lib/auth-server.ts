import { cookies } from 'next/headers';
import { query } from '@/lib/db/pool';
import { COOKIE_NAME, verifySession } from '@/lib/db/auth';
import type { CurrentProfile } from '@/lib/auth';

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const payload = await verifySession(sessionCookie);
  if (!payload) return null;

  const r = await query(
    `SELECT id, name AS username, email AS email_or_phone, role, branch_id,
            COALESCE(visible_modules, '{}') AS visible_modules,
            COALESCE(is_active, true) AS is_active
     FROM mazaya.users WHERE id = $1`,
    [payload.userId]
  );
  if (r.rows.length === 0) return null;
  return r.rows[0] as CurrentProfile;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: Admin only");
  }
  return profile;
}
