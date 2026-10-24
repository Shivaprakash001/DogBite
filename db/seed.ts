import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { COLLEGES } from '../src/content/places';
import { QUESTION_BANK } from '../src/content/questions.seed';
import * as schema from '../src/server/db/schema';

// Content seed: question bank + colleges. Safe to re-run (upserts by key).
// Editorial fields are overwritten from the seed file; `active` is left alone
// so admin retire/restore decisions survive a re-seed.

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  for (const q of QUESTION_BANK) {
    const [row] = await db
      .insert(schema.questions)
      .values({
        key: q.key,
        textTemplate: q.text,
        objectiveTag: q.objective_tag,
        kind: q.kind,
        segment: q.segment,
        funScore: q.fun_score,
        dataValue: q.data_value,
        sensitivity: q.sensitivity,
      })
      .onConflictDoUpdate({
        target: schema.questions.key,
        set: {
          textTemplate: q.text,
          objectiveTag: q.objective_tag,
          kind: q.kind,
          segment: q.segment,
          funScore: q.fun_score,
          dataValue: q.data_value,
          sensitivity: q.sensitivity,
        },
      })
      .returning({ id: schema.questions.id });

    await db.insert(schema.questionStats).values({ questionId: row.id }).onConflictDoNothing();

    for (const [i, o] of q.options.entries()) {
      await db
        .insert(schema.options)
        .values({ questionId: row.id, key: o.key, label: o.label, emoji: o.emoji, imageAsset: o.image ?? null, sort: i })
        .onConflictDoUpdate({
          target: [schema.options.questionId, schema.options.key],
          set: { label: o.label, emoji: o.emoji, imageAsset: o.image ?? null, sort: i },
        });
    }
  }

  for (const c of COLLEGES) {
    await db.insert(schema.colleges).values(c).onConflictDoNothing();
  }

  const [{ count }] = await db.execute<{ count: number }>(sql`select count(*)::int as count from questions`);
  console.log(`✓ seeded ${QUESTION_BANK.length} questions (${count} in db), ${COLLEGES.length} colleges`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
