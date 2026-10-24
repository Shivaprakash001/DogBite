import 'dotenv/config';
import postgres from 'postgres';

// E2E runs hammer the API from one IP; start each run with empty limiter counters.
// Only ever touches the rate_limits table.
export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = postgres(url, { max: 1 });
  await sql`delete from rate_limits`;
  await sql.end();
}
