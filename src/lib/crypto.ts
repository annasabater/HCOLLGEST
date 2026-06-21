/**
 * Cifrado en reposo (§7) — AES-256-GCM.
 * Para documentos de identidad (DNI/pasaporte) y secretos como la contraseña
 * de Mossos. Formato del payload cifrado:  [IV(12) | authTag(16) | ciphertext].
 *
 * ⚠ Si se pierde DOCUMENT_ENCRYPTION_KEY, los datos cifrados son irrecuperables.
 */
import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getEncryptionKey } from './env';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

/** Cifra un Buffer. Devuelve [IV | authTag | ciphertext]. */
export function encryptBuffer(plain: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

/** Descifra un Buffer con formato [IV | authTag | ciphertext]. */
export function decryptBuffer(enc: Buffer): Buffer {
  const key = getEncryptionKey();
  if (enc.length < IV_LEN + TAG_LEN) {
    throw new Error('Payload cifrado inválido (demasiado corto).');
  }
  const iv = enc.subarray(0, IV_LEN);
  const authTag = enc.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = enc.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** Cifra un string y lo devuelve en base64 (para guardar en BD: p.ej. mossos_pass_enc). */
export function encryptString(plain: string): string {
  return encryptBuffer(Buffer.from(plain, 'utf-8')).toString('base64');
}

/** Descifra un string base64 producido por encryptString. */
export function decryptString(encBase64: string): string {
  return decryptBuffer(Buffer.from(encBase64, 'base64')).toString('utf-8');
}
