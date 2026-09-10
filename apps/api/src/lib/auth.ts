import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

export function getJwtExpiry(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export interface JwtClaims {
  sub: string;
  role: string;
  name: string;
}

export type SafeUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'headline' | 'avatarUrl' | 'createdAt' | 'updatedAt'>;

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    headline: user.headline,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function signToken(user: User): string {
  const claims: JwtClaims = { sub: user.id, role: user.role, name: user.name };
  return jwt.sign(claims, getJwtSecret(), { expiresIn: getJwtExpiry() as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtClaims {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === 'object' && decoded !== null && typeof decoded.sub === 'string') {
      return decoded as unknown as JwtClaims;
    }
    throw new AuthError('Invalid session token');
  } catch (err: unknown) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('Invalid or expired session. Please sign in again.');
  }
}