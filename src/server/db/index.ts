import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

// Reuse one pool across hot reloads in dev and across requests on Fluid Compute.
const globalForDb = globalThis as unknown as { __stayoDb?: Db };

export function db(): Db {
  if (!globalForDb.__stayoDb) {
    const client = postgres(env().DATABASE_URL, { max: 10, prepare: false });
    globalForDb.__stayoDb = drizzle(client, { schema });
  }
  return globalForDb.__stayoDb;
}

export { schema };
