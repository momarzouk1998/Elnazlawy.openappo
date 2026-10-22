import { SignJWT, jwtVerify } from 'jose';

let cachedSecret: Uint8Array | null = null;

export function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return new TextEncoder().encode('temporary-dev-secret-only');
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export const COOKIE_NAME = 'elnazlawy_session';

export async function signSession(user: {
  id: number;
  username: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifySession(
  token: string
): Promise<{ sub: number; username: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      sub: Number(payload.sub) || 0,
      username: String(payload.username || ''),
      role: String(payload.role || ''),
    };
  } catch {
    return null;
  }
}
