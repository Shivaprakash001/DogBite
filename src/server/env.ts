import 'server-only';
import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .pipe(z.url().optional())
  .optional();

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Signs admin cookies. 32+ random chars. */
  SESSION_SECRET: z.string().min(32),
  /** 32-byte key, base64, for owner contact encryption at rest. */
  CONTACT_ENC_KEY: z.string().min(40),
  /** Comma-separated admin access keys (v1 allowlist). */
  ADMIN_KEYS: z.string().default(''),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
  DISCOVER_BASE_URL: optionalUrl,
  OWNER_SIGNUP_URL: optionalUrl,
  TENANT_SIGNUP_URL: optionalUrl,
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}. See .env.example`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function siteUrl(path = ''): string {
  return new URL(path, env().NEXT_PUBLIC_SITE_URL).toString();
}
