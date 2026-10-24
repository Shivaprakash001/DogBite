# Roomie Quiz by Stayo

A mascot-led hostel friendship quiz: a student makes a 10-question quiz about their hostel life in about two minutes, shares it, and friends guess.
Underneath, it builds a hostel database, measures demand for tenant features, and gives students a report card to send to their owner, all in
aggregate (≥5 respondents) and without ever feeling like a form.

The product brief lives in [`CLAUDE.md`](CLAUDE.md). Choices made along the way are in [`docs/decisions.md`](docs/decisions.md); animation and sound
seams are in [`docs/animation-hooks.md`](docs/animation-hooks.md).

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript strict · Tailwind CSS v4 · PostgreSQL + Drizzle ORM (pg_trgm) · Zod · Vitest · Playwright.
Built to be Vercel-compatible (Node runtime, no server-only assumptions); not deployed yet.

## Run it locally

Requires Node 20.9+ (24 recommended) and Docker or Podman.

```bash
# 1. Postgres (any Postgres 14+ with pg_trgm works)
docker run -d --name stayo-quiz-db -e POSTGRES_USER=stayo -e POSTGRES_PASSWORD=stayo \
  -e POSTGRES_DB=stayo_quiz -p 54329:5432 postgres:16-alpine

# 2. Environment
cp .env.example .env
# fill SESSION_SECRET (openssl rand -base64 48), CONTACT_ENC_KEY (openssl rand -base64 32),
# ADMIN_KEYS (openssl rand -hex 24)

# 3. Install, migrate, seed the question bank
npm install
npm run db:setup

# 4. Optional: fake hostels, quizzes and plays for local dashboards (tagged, local-only)
npm run db:seed:dev            # npm run db:seed:dev -- --reset removes it

npm run dev                    # http://localhost:3000
```

Admin: open `/admin` and sign in with one of the `ADMIN_KEYS`. Component reference (dev only): `/dev/components`.

## Scripts

| Script                                        | What it does                                              |
| --------------------------------------------- | --------------------------------------------------------- |
| `npm run dev` / `build` / `start`             | Next.js                                                   |
| `npm run check`                               | typecheck + lint + unit tests                             |
| `npm test`                                    | Vitest unit tests (pure logic)                            |
| `npm run test:e2e`                            | Playwright: create → share → play → result (needs the DB) |
| `npm run format`                              | Prettier                                                  |
| `npm run db:generate`                         | new migration from `src/server/db/schema.ts`              |
| `npm run db:migrate` / `db:seed` / `db:setup` | apply migrations, upsert questions + colleges             |

## Where things live

```
src/app/            routes (pages, API route handlers, OG/story images)
src/components/     ui/ (design system) · creator/ · quiz/ · scoreboard/ · hostel/ · admin/ · flow/
src/content/        question bank, result tiers, teasers, places, copy (all UI strings), asset manifest
src/lib/            pure logic: scoring, selection (bandit), aggregation (k-anonymity), moderation, events
src/server/         db + schema, repositories, session/consent, rate limits, crypto, OG renderer
src/styles/         design tokens (tokens.css) + TS mirror for images
db/                 migrations, seed, dev seed
tests/              unit/ (Vitest) · e2e/ (Playwright)
```

Brand change = edit `src/styles/tokens.css`. Copy change = edit `src/content/copy.ts`. New questions = `src/content/questions.seed.ts` then
`npm run db:seed`. Tuning (bandit weights, caps, k floor, feature thresholds, timings) = `src/config.ts`.

## Routes

| Route                                                   |                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/`                                                     | landing + live hostel strip                                             |
| `/create`, `/create/done/[slug]`                        | creator flow, share screen                                              |
| `/q/[slug]`, `/play`, `/result/[attemptId]`, `/board`   | quiz landing, player flow, result, scoreboard                           |
| `/hostel/[slug]`, `/leaderboard`, `/leaderboard/[area]` | hostel page, Hostel Face-off                                            |
| `/report/[slug]` (`?v=owner`)                           | Hostel Report Card, owner view                                          |
| `/discover`                                             | UTM-tagged hand-off to `DISCOVER_BASE_URL`                              |
| `/privacy`                                              | what we collect, delete my quiz / my data                               |
| `/admin/*`                                              | funnel, virality, research, question health, hostels, feature decisions |

## Deploying

Vercel: set the env vars from `.env.example` (use a managed Postgres such as Neon or Supabase with `pg_trgm` enabled), run
`npm run db:setup` against it once, deploy. `DISCOVER_BASE_URL`, `OWNER_SIGNUP_URL` and `TENANT_SIGNUP_URL` are optional; their CTAs hide when unset.
