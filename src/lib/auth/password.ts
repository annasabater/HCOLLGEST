/**
 * Hashing de contraseñas con bcryptjs (JS puro, sin binarios nativos → OK en
 * Windows). Coste 12.
 */
import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
