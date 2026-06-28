import { cookies } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { COOKIE_NAME, verifySession } from '@/lib/db/auth';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'branch_user';
  branch_id: string | null;
  visible_modules: string[];
  permissions: Record<string, string[]>;
  is_active: boolean;
}

/** Get the current user from the session cookie. Returns null if not authenticated. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const user = await prisma.users.findFirst({
    where: { id: payload.sub, is_active: true },
    select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true },
  });
  if (!user) return null;

  return {
    ...user,
    visible_modules: user.visible_modules || [],
    permissions: user.permissions || {},
  } as User;
}

/** Get current user or throw. For use in API route handlers. */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const err: any = new Error('UNAUTHORIZED');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return user;
}

/** Get current user or throw if not admin. */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    const err: any = new Error('FORBIDDEN');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  return user;
}

/** Check if user has a specific permission on a module. */
export function hasPermission(
  user: User,
  module: string,
  action: string
): boolean {
  if (user.role === 'admin') return true;
  const modulePerms = user.permissions?.[module];
  if (!modulePerms || !Array.isArray(modulePerms)) return false;
  return modulePerms.includes(action);
}

/** Check if a branch_user can see a module. */
export function canSeeModule(user: User, moduleKey: string): boolean {
  if (user.role === 'admin') return true;
  return user.visible_modules?.includes(moduleKey) ?? false;
}

/** Unified JSON error response helper. */
export function jsonError(message: string, code?: string, status?: number) {
  const s = status || 400;
  const c = code || 'VALIDATION_ERROR';
  return { ok: false, error: { code: c, message } };
}

/** Unified JSON success response helper. */
export function jsonOk<T>(data: T, status?: number) {
  return { ok: true, data };
}
