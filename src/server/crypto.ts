import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';

// AES-256-GCM for owner contact data at rest (§11.3, §13). Format: base64(iv|tag|ciphertext).

function key(): Buffer {
  const k = Buffer.from(env().CONTACT_ENC_KEY, 'base64');
  if (k.length !== 32) throw new Error('CONTACT_ENC_KEY must decode to 32 bytes');
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

/** Keyed hash for values we only need to compare (phones, IPs, user agents). */
export function keyedHash(value: string, purpose: string): string {
  return createHmac('sha256', env().SESSION_SECRET).update(`${purpose}:${value}`).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
