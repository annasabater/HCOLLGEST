import { describe, it, expect, beforeAll } from 'vitest';

// Clau de 32 bytes (base64) per al test, abans d'importar el mòdul (lazy env).
beforeAll(() => {
  process.env.DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('crypto AES-256-GCM (§7)', () => {
  it('xifra i desxifra un string (round-trip)', async () => {
    const { encryptString, decryptString } = await import('./crypto');
    const plain = 'Contrasenya Mossos · àçñé';
    const enc = encryptString(plain);
    expect(enc).not.toBe(plain);
    expect(decryptString(enc)).toBe(plain);
  });

  it('cada xifratge és diferent (IV aleatori) però desxifra igual', async () => {
    const { encryptString, decryptString } = await import('./crypto');
    const a = encryptString('secret');
    const b = encryptString('secret');
    expect(a).not.toBe(b); // IV diferent
    expect(decryptString(a)).toBe('secret');
    expect(decryptString(b)).toBe('secret');
  });

  it('detecta manipulació (authTag GCM) i llança', async () => {
    const { encryptString, decryptString } = await import('./crypto');
    const enc = Buffer.from(encryptString('dades'), 'base64');
    const last = enc.length - 1;
    enc[last] = (enc[last] ?? 0) ^ 0xff; // corromp l'últim byte del ciphertext
    expect(() => decryptString(enc.toString('base64'))).toThrow();
  });

  it('xifra i desxifra buffers binaris', async () => {
    const { encryptBuffer, decryptBuffer } = await import('./crypto');
    const data = Buffer.from([0, 1, 2, 250, 255, 128]);
    expect(decryptBuffer(encryptBuffer(data)).equals(data)).toBe(true);
  });
});
