import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
);
export const COOKIE_NAME = 'mazaya_session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(user: {
  id: number;
  username: string;
  role: string;
  branch_id: number | null;
}): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    username: user.username,
    role: user.role,
    branch_id: user.branch_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySession(
  token: string
): Promise<{ sub: number; username: string; role: string; branch_id: number | null } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: Number(payload.sub) || 0,
      username: (payload.username as string) || '',
      role: (payload.role as string) || '',
      branch_id: Number(payload.branch_id) || null,
    };
  } catch {
    return null;
  }
}
