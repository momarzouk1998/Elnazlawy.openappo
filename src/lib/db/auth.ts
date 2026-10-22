import bcrypt from 'bcryptjs';

export { COOKIE_NAME, getJwtSecret, signSession, verifySession } from '@/lib/jwt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
