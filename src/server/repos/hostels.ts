import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { HOSTELS } from '@/config';
import { slugifyArea } from '@/content/places';
import type { HostelDTO } from '@/lib/api-types';
import { normalizeHostelName, slugify, tidyHostelName } from '@/lib/hostels';
import { encrypt, keyedHash } from '../crypto';
import { db, schema } from '../db';
import { ApiError } from '../http';

export type Hostel = typeof schema.hostels.$inferSelect;

export function toHostelDTO(h: Hostel): HostelDTO {
  return { id: h.id, slug: h.slug, name: h.name, area: h.area, city: h.city, type: h.type };
}

const visible = and(isNull(schema.hostels.mergedInto), eq(schema.hostels.hidden, false));

export async function getHostelById(id: string): Promise<Hostel | null> {
  const [h] = await db().select().from(schema.hostels).where(eq(schema.hostels.id, id));
  if (h?.mergedInto) return getHostelById(h.mergedInto);
  return h ?? null;
}

/** Follows merges so old links keep working. */
export async function getHostelBySlug(slug: string): Promise<Hostel | null> {
  const [h] = await db().select().from(schema.hostels).where(eq(schema.hostels.slug, slug));
  if (h?.mergedInto) return getHostelById(h.mergedInto);
  return h ?? null;
}

export async function searchHostels(query: string, city: string | null): Promise<HostelDTO[]> {
  const q = normalizeHostelName(query);
  const cityFilter = city ? eq(schema.hostels.city, city) : undefined;
  if (!q) {
    // No query: most active hostels first, so the common pick is one tap away.
    const rows = await db()
      .select({ h: schema.hostels })
      .from(schema.hostels)
      .leftJoin(schema.creators, eq(schema.creators.hostelId, schema.hostels.id))
      .where(and(visible, cityFilter))
      .groupBy(schema.hostels.id)
      .orderBy(desc(sql`count(${schema.creators.id})`), schema.hostels.name)
      .limit(HOSTELS.searchLimit);
    return rows.map((r) => toHostelDTO(r.h));
  }
  const sim = sql<number>`similarity(${schema.hostels.nameNormalized}, ${q})`;
  const rows = await db()
    .select({ h: schema.hostels, sim })
    .from(schema.hostels)
    .where(
      and(
        visible,
        cityFilter,
        sql`(${schema.hostels.nameNormalized} % ${q} or ${schema.hostels.nameNormalized} ilike ${`%${q}%`} or ${schema.hostels.area} ilike ${`%${query.trim()}%`})`,
      ),
    )
    .orderBy(desc(sql`${sim} + case when ${schema.hostels.nameNormalized} ilike ${`${q}%`} then 0.5 else 0 end`))
    .limit(HOSTELS.searchLimit);
  return rows.map((r) => toHostelDTO(r.h));
}

export async function findDuplicates(name: string, city: string, area: string): Promise<(HostelDTO & { similarity: number })[]> {
  const q = normalizeHostelName(name);
  if (!q) return [];
  const sim = sql<number>`similarity(${schema.hostels.nameNormalized}, ${q})`;
  const rows = await db()
    .select({ h: schema.hostels, sim })
    .from(schema.hostels)
    .where(and(visible, eq(schema.hostels.city, city), eq(schema.hostels.areaSlug, slugifyArea(area)), sql`${sim} >= ${HOSTELS.duplicateSimilarity}`))
    .orderBy(desc(sim))
    .limit(3);
  return rows.map((r) => ({ ...toHostelDTO(r.h), similarity: Number(r.sim) }));
}

export async function findCollegeId(name: string, city: string): Promise<number | null> {
  const [c] = await db()
    .select({ id: schema.colleges.id })
    .from(schema.colleges)
    .where(and(eq(schema.colleges.name, name), eq(schema.colleges.city, city)));
  return c?.id ?? null;
}

export interface NewHostel {
  name: string;
  city: string;
  area: string;
  type: HostelDTO['type'];
  collegeId: number | null;
}

/**
 * Create a hostel. If near-duplicates exist and the student said "mine is
 * different", the pair goes to the admin merge queue instead of being dropped.
 */
export async function createHostel(input: NewHostel, sid: string, confirmedDifferent: boolean): Promise<{ hostel: HostelDTO } | { duplicates: HostelDTO[] }> {
  const duplicates = await findDuplicates(input.name, input.city, input.area);
  if (duplicates.length && !confirmedDifferent) return { duplicates };

  const name = tidyHostelName(input.name);
  const base = slugify(`${name} ${input.area}`) || 'hostel';
  let created: Hostel | undefined;
  for (let i = 0; i < 5 && !created; i++) {
    const slug = i === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    [created] = await db()
      .insert(schema.hostels)
      .values({
        slug,
        name,
        nameNormalized: normalizeHostelName(name),
        area: input.area.trim(),
        areaSlug: slugifyArea(input.area),
        city: input.city,
        type: input.type,
        collegeId: input.collegeId,
        createdBySession: sid,
      })
      .onConflictDoNothing()
      .returning();
  }
  if (!created) throw new ApiError(500, 'slug_collision');
  if (duplicates.length) {
    await db()
      .insert(schema.hostelMergeCandidates)
      .values(duplicates.map((d) => ({ hostelId: created!.id, candidateId: d.id, similarity: d.similarity })))
      .onConflictDoNothing();
  }
  return { hostel: toHostelDTO(created) };
}

/** Admin merge: source → target, repointing every foreign key. */
export async function mergeHostels(sourceId: string, targetId: string): Promise<void> {
  if (sourceId === targetId) throw new ApiError(400, 'same_hostel');
  await db().transaction(async (tx) => {
    await tx.update(schema.creators).set({ hostelId: targetId }).where(eq(schema.creators.hostelId, sourceId));
    await tx.update(schema.attempts).set({ hostelId: targetId }).where(eq(schema.attempts.hostelId, sourceId));
    await tx.update(schema.waitlistTaps).set({ hostelId: targetId }).where(eq(schema.waitlistTaps.hostelId, sourceId));
    await tx.update(schema.shares).set({ hostelId: targetId }).where(eq(schema.shares.hostelId, sourceId));
    await tx.update(schema.hostelContacts).set({ hostelId: targetId }).where(eq(schema.hostelContacts.hostelId, sourceId));
    await tx.update(schema.hostels).set({ mergedInto: targetId }).where(eq(schema.hostels.id, sourceId));
    // Anything that pointed at the source now points at the target.
    await tx.update(schema.hostels).set({ mergedInto: targetId }).where(eq(schema.hostels.mergedInto, sourceId));
    await tx
      .update(schema.hostelMergeCandidates)
      .set({ status: 'merged' })
      .where(
        and(
          eq(schema.hostelMergeCandidates.status, 'open'),
          sql`(${schema.hostelMergeCandidates.hostelId} = ${sourceId} or ${schema.hostelMergeCandidates.candidateId} = ${sourceId})`,
        ),
      );
  });
}

export async function dismissMergeCandidate(id: number): Promise<void> {
  await db().update(schema.hostelMergeCandidates).set({ status: 'dismissed' }).where(eq(schema.hostelMergeCandidates.id, id));
}

const AUTO_HIDE_FLAGS = 5;

export async function flagHostel(hostelId: string, sid: string): Promise<void> {
  await db().insert(schema.hostelFlags).values({ hostelId, sessionId: sid }).onConflictDoNothing();
  const [{ n }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.hostelFlags)
    .where(eq(schema.hostelFlags.hostelId, hostelId));
  if (n >= AUTO_HIDE_FLAGS) {
    await db()
      .update(schema.hostels)
      .set({ hidden: true })
      .where(and(eq(schema.hostels.id, hostelId), ne(schema.hostels.status, 'verified')));
  }
}

/** Indian mobile numbers: 10 digits starting 6–9, optional +91 / 0 prefix. */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export async function addOwnerContact(
  hostelId: string,
  sid: string,
  input: { name: string | null; phone: string; relation: 'owner' | 'warden' | 'manager' | 'unknown' },
): Promise<void> {
  const phone = normalizeIndianPhone(input.phone);
  if (!phone) throw new ApiError(400, 'invalid_phone');
  const phoneHash = keyedHash(phone, 'phone');
  const [existing] = await db()
    .select({ id: schema.hostelContacts.id })
    .from(schema.hostelContacts)
    .where(and(eq(schema.hostelContacts.hostelId, hostelId), eq(schema.hostelContacts.phoneHash, phoneHash)));
  if (existing) return;
  await db()
    .insert(schema.hostelContacts)
    .values({
      hostelId,
      phoneEnc: encrypt(phone),
      phoneHash,
      contactNameEnc: input.name ? encrypt(input.name) : null,
      relation: input.relation,
      submittedBySession: sid,
      consentAt: new Date(),
    });
}
