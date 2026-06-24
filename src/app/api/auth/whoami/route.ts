import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth-server";
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySession } from '@/lib/db/auth';
import { query } from '@/lib/db/pool';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  const payload = sessionCookie ? await verifySession(sessionCookie) : null;
  const profile = await getCurrentProfile();

  let user: any = null;
  if (payload) {
    const r = await query('SELECT id, email, name, role FROM mazaya.users WHERE id = $1', [payload.userId]);
    if (r.rows.length > 0) user = r.rows[0];
  }

  return NextResponse.json({
    auth_user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } : null,
    profile,
    has_session: !!payload,
    has_profile: !!profile,
  });
}
