# CLAUDE.md — Stayo Hostel Quiz ("Roomie Quiz") Build Brief

> Implementation status, choices that differ from this brief, and their reasons are recorded in `docs/decisions.md`. Read it alongside this file.
> **Chat overrides (2026-10-24):** the hook is “Will {name} kick you out of the room?” (roommate compatibility), not “block you”. Main
> characters are a boy and a girl; the Stayo dog is the creator's room-guard companion that pulls the scoreboard and chases (low score)
> or loves (high score) the player.
> Next.js 16 specifics: see `AGENTS.md` (read the bundled docs in `node_modules/next/dist/docs/` before using Next APIs).

You are the lead engineer and product-minded builder for **Stayo Hostel Quiz**, a viral, mascot-led quiz game for college students who live in hostels. Build the full engine, data layer, flows and UI from scratch, following this brief. Animations and sound effects are **deferred**: build clean hook points for them (Section 10) but do not implement them yet.

Read this entire file before writing code. When this file and a request in chat conflict, the chat request wins, but tell me about the conflict in one line.

---

## 1. Mission

Stayo is a hostel management platform (owner side and tenant side) with a Discover page, similar to Airbnb but only for hostels. This game is a **growth and research engine** that must achieve four goals at once, while feeling like pure entertainment:

1. **Collect tenant preference data** (gym habits, nutrition tracking, food satisfaction, laundry, rent payment behavior, hostel pain points, willingness to pay) so Stayo can decide which tenant-side features to build.
2. **Build a hostel database**: hostel names, areas, colleges, and, only when a student volunteers it, owner/warden contact details.
3. **Funnel players to Stayo's Discover page** and teach them what Stayo's management system does.
4. **Turn students into a channel to owners**: students share a hostel report card with their owner/warden, who then learns about Stayo.

**The one rule that governs every decision: it must never feel like a Google Form.** Fun first, data rides along. If a feature makes the game feel like a survey, cut it.

### Inspiration (the proven mechanic)

The game "Don't Block Me" works like this: a creator makes a 10-question quiz about themselves → shares a link → friends take it, guessing the creator's answers → a suspenseful score reveal with a tiered, funny result → a "create your own" call to action at peak emotion → a scoreboard of friends. Key traits to preserve: no signup, name-only entry, two photo-card answers per question, a live progress strip, a suspense beat before the reveal, tiered result copy, a visible scoreboard, a pre-drafted question bank that lets creators finish in about two minutes, and cute mascots.

### Our twist

- **The hostel is the unit of virality.** Players pick their hostel; scoreboards and rivalry exist at the hostel, area and college level.
- Questions are about hostel life, not generic life.
- Research objectives are hidden inside fun questions (Section 8).
- The result screen funnels to Discover and to a shareable Hostel Report Card.

---

## 2. Principles (non-negotiable)

1. **Zero-friction entry.** No email, password or OTP for players. Name only. Anonymous session id in a cookie.
2. **Mobile-first.** Design for 360–430px wide phones. Desktop is a centered phone-width column.
3. **Fast.** Quiz screens must be interactive in under 2 seconds on a mid-range Android on 4G. Keep the JS bundle small, lazy-load assets, and preload the next question's images.
4. **Share-first.** Every state that can be shared has a clean URL and a good Open Graph preview.
5. **Data is a by-product.** Never show a research question as a labeled "survey". Every question must pass the fun test (Section 8).
6. **Honest and safe.** Aggregated data only, privacy by design, age gate, consent (Section 13). Nothing is shown to owners at individual level.
7. **Content-driven.** Questions, result tiers, mascots and copy live in data files/DB, not hard-coded in components.
8. **Instrumented from day one.** Every meaningful interaction emits an event (Section 12).
9. **Animation-ready.** Build the structure so animation and sound plug in later without refactoring (Section 10).

---

## 3. Brand and assets

The Stayo brand assets and reference screens will be provided by me. Until then, use these defaults and keep them all in one theme file so they can be swapped:

- **Palette (Stayo terracotta):** Warm Clay `#B46A55`, Terra Cotta `#A45D44`, Dusty Orange `#D2986C`, Latte `#EBD9C4`, Charcoal `#2F2F2F`. Add supporting soft neutrals and one bright accent for CTAs after you see my references.
- **Typography:** Manrope for headings, Inter for body.
- **Logo:** custom "S" monogram (house + four-pane window motif) with the "Stayo" wordmark.
- **Tone:** warm, cute, playful, mascot-led, safe for all genders. Rounded corners, sticker-like decorations, soft shadows, chunky tactile buttons.

**Asset handling rules:**

- Put all brand assets in `/public/brand/` (logo, mascots, stickers, backgrounds) and question images in `/public/questions/`.
- Reference assets only through a manifest (`/src/content/assets.ts`) mapping semantic keys (`mascot.male.idle`, `mascot.female.shock`, `sticker.heart`, …) to files. If an asset is missing, render a neutral placeholder and log a warning. Never block the build on missing art.
- When I share reference screens, study layout, spacing, hierarchy, button style and card style, and apply them via the theme and design tokens. Do not copy third-party characters or artwork from the inspiration game. Use Stayo's own mascots.
- Build UI from a small component library (Section 5) so a brand change is a token change, not a rewrite.

---

## 4. Tech stack (defaults)

First **inspect the repo**. If a stack already exists, follow it. Otherwise use:

- **Framework:** Next.js (App Router) + TypeScript (strict)
- **Styling:** Tailwind CSS with design tokens in a theme file
- **Database:** PostgreSQL (Supabase or any managed Postgres) with a typed ORM (Drizzle or Prisma) and migrations
- **Validation:** Zod on every API input
- **State:** React server components by default; small client state with Zustand or `useReducer` only where needed
- **Hosting:** Vercel-compatible; no server-only assumptions that block that
- **Analytics:** first-party `events` table (Section 12). Do not add third-party trackers without asking.
- **Tests:** Vitest for logic (scoring, question selection, aggregation, k-anonymity); Playwright for the critical flows (create → share → play → result)
- **Quality:** ESLint, Prettier, strict TypeScript, no `any` without a comment

If I say my team prefers Python/FastAPI for the backend, keep the same API contracts and data model and expose them over REST.

### Repo layout

```
/src
  /app                    # routes (see Section 6)
  /components
    /ui                   # Button, Card, PhotoCard, ProgressPills, Mascot, Sticker, Toast, Sheet
    /quiz                 # QuestionCard, AnswerGrid, ProgressStrip, RevealStage, ResultCard
    /creator              # PickerList, QuestionPickItem, CreatorProgress
    /scoreboard           # ScoreRow, HostelBoard, RankBadge
  /content
    assets.ts             # asset manifest
    questions.seed.ts     # question bank (Section 8)
    results.ts            # result tiers and copy
    copy.ts               # all UI strings (English first; i18n-ready)
  /lib
    scoring.ts            # pure functions
    selection.ts          # question selection algorithm
    aggregation.ts        # report card + k-anonymity
    events.ts             # tracking client + types
    hostels.ts            # normalization, dedupe, search
  /server                 # db, repositories, route handlers
  /styles                 # tokens, globals
  /hooks                  # useReveal, useSound (stubs), useSession
/db
  /migrations
  seed.ts
/tests
```

---

## 5. Component and design system

Build and document these first (a simple `/dev/components` page is enough):

- `Button` (primary chunky blue/brand CTA, secondary, ghost) with pressed state
- `Card` (notebook-paper style, rounded, soft shadow, dashed inner border)
- `PhotoCard` (image over label; selected, correct and wrong states)
- `ProgressPills` (10 numbered pills; states: upcoming, current, correct ✓, wrong ✗)
- `Mascot` (props: `gender`, `mood`; reads from asset manifest; has an `animation` prop reserved but unused for now)
- `Sticker` (decorative, absolutely positioned, `aria-hidden`)
- `Sheet` and `Toast`
- `LanguageSwitcher` (UI only; English strings first, structure ready for Hindi and Telugu)

Accessibility: tap targets ≥ 44px, color contrast AA, visible focus states, alt text on all question images, `prefers-reduced-motion` respected from day one, and no information conveyed by color alone (pair ✓ / ✗ with icons).

---

## 6. Screens and routes

**Player and creator are one product.** Everyone can play; anyone can create.

| Route                          | Purpose                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/`                            | Landing: hook headline, mascot, **Start** CTA, public "hostel leaderboard" teaser, language switch    |
| `/q/[slug]`                    | Quiz landing for a specific creator ("Will {creator} block you?"), scoreboard preview, **Start quiz** |
| `/q/[slug]/play`               | Name → hostel pick → 10 questions → suspense → result                                                 |
| `/q/[slug]/result/[attemptId]` | Result (shareable image/OG), scoreboard, CTAs                                                         |
| `/create`                      | Creator flow: name → gender/mascot → hostel → pick 10 questions → answer each → publish               |
| `/create/done/[slug]`          | Share screen: copy link, WhatsApp, Instagram/Story-friendly image, "see who played"                   |
| `/q/[slug]/board`              | Creator's scoreboard (also the player's rank view)                                                    |
| `/hostel/[hostelSlug]`         | Public hostel page: top players, hostel rank, **aggregated** fun stats (min 5 responses)              |
| `/leaderboard/[area]`          | Hostel Face-off: rankings by area/college                                                             |
| `/discover` (link out)         | Deep link to Stayo's Discover page, with UTM params and a `from_quiz` param                           |
| `/report/[hostelSlug]`         | Hostel Report Card (Section 13); shareable with an owner/warden                                       |
| `/admin`                       | Protected: hostel merge queue, question bank health, funnel dashboard (Section 15)                    |

### 6.1 Landing

Hook headline and challenge framing (exact copy in `copy.ts`; default "will your roomie block you?"). One dominant CTA. Below it, an auto-updating scoreboard strip of "hostels playing near you" (use real data, show a friendly empty state when there's none). Never ask for anything before CTA.

### 6.2 Player flow (`/q/[slug]/play`)

1. **Name** (max 15 chars, live counter, profanity filter, no emoji-only).
2. **Hostel pick**: searchable list (see Section 7.2), with "can't find mine → add it". This is framed as "join your hostel's leaderboard", not as data collection. Skippable ("skip, play solo"); skipping is a signal (log it).
3. **10 questions**, one per screen: question + two big photo cards (two-option guess). Tap to answer → immediate feedback state on the progress pill → auto-advance after a short delay (use a constant; animation timing will be tuned later). Allow no back navigation once answered.
4. **Suspense screen**: "just look at my score 🫣" style beat with both mascots. Build it as its own stage with a minimum dwell time that is configurable (default 1.5s). This is where animation will be added later.
5. **Result**: big score "x/10", tier message, mascot mood by tier, result teaser card (Section 11), "now it's your turn → create your own quiz", scoreboard.

### 6.3 Creator flow (`/create`) — this is the most important flow

Goal: a complete, personal quiz in **under 2 minutes with zero typing beyond a name**.

1. **Name** (max 15).
2. **Mascot/gender** (bear/panda style cards; drives pronouns in question text: he/she/they-neutral fallback).
3. **Hostel pick** (same component as player; optional but encouraged).
4. **Question picking**: show about 20 candidate questions chosen by the selection algorithm (Section 8.4). The creator picks exactly 10. Show them as a swipeable or scrollable list with a counter "7/10 picked". Include a "shuffle for more" action that fetches another batch (limit 3 shuffles).
5. **Answering**: for each picked question, show the creator's answer options as visual cards (photo + label + emoji). Auto-advance on tap. A **Skip** button swaps in a replacement question (log which topic got skipped).
6. **Publish**: generate `slug`, show a "your quiz is live" screen with share actions.

Creator experience rules:

- Question text auto-fills the creator's name ("What does {name} spend most of {pronoun} money on?").
- Show a progress bar `n/10`. Never show more than one decision per screen.
- Autosave to the server after every answer. A returning creator resumes where they left off (session cookie).
- Creators can never edit published answers (prevents manipulation); they can delete the quiz.

### 6.4 Quiz presentation: two-option guess

For the player, every question presents **two options**: the creator's real answer + one plausible distractor chosen from the same question's option set (random but seeded per attempt so refresh doesn't reroll). This keeps scores reachable (50% by chance), the interface one-tap, and the questions photo-friendly.

---

## 7. Data model

Use migrations. Suggested tables (adjust names to the ORM, keep the semantics):

```
sessions        (id, created_at, last_seen_at, ua_hash, locale, consent_at, adult_confirmed_at)
hostels         (id, slug, name, name_normalized, area, city, college_id?, type[boys|girls|coed|unknown],
                 status[user_added|verified|claimed], lat?, lng?, created_by_session, merged_into?, created_at)
colleges        (id, name, city)
hostel_contacts (id, hostel_id, contact_name?, phone_enc, relation[owner|warden|manager|unknown],
                 source[student_opt_in], submitted_by_session, consent_at, status[unverified|verified|opted_out])
creators        (id, session_id, display_name, gender, hostel_id?, created_at)
quizzes         (id, slug, creator_id, status[draft|live|deleted], created_at, published_at)
questions       (id, key, text_template, objective_tag, segment[boys|girls|coed|all],
                 fun_score, data_value, sensitivity[0-2], active, created_at)
options         (id, question_id, key, label, emoji, image_asset, sort)
quiz_questions  (id, quiz_id, question_id, position, creator_option_id, skipped_from_question_id?)
attempts        (id, quiz_id, session_id, player_name, hostel_id?, score, started_at, finished_at, device)
attempt_answers (id, attempt_id, quiz_question_id, shown_option_ids[2], chosen_option_id, is_correct, ms_to_answer)
events          (id, session_id, name, props jsonb, created_at)
waitlist_taps   (id, session_id, feature_key, hostel_id?, created_at)
shares          (id, session_id, quiz_id?, channel, created_at, ref_session_id?)
```

### 7.1 Referral and virality tracking

Every share link carries `?ref=<sessionId or quizSlug>`. Store the referrer on first arrival. This lets you compute: play → create conversion, K-factor, hostel-to-hostel spread, and college-to-college spread.

### 7.2 Hostel search, normalization and dedupe

- Normalize on write: lowercase, strip punctuation and common words ("boys", "girls", "hostel", "pg", "the"), collapse whitespace.
- Search with trigram similarity (Postgres `pg_trgm`) so "Sri Adithya", "sri aditya boys hostel", etc. surface the same hostel.
- When a student adds a new hostel, check similarity ≥ 0.6 against existing records in the same area and ask "is this the same as …?" before creating.
- Unresolved near-duplicates go to the admin **merge queue**; merging sets `merged_into` and repoints foreign keys.
- Area is picked via a lightweight list/autocomplete (city → area); store free text only if the area is missing.

---

## 8. Question bank and selection algorithm

### 8.1 Question schema (seed file)

Each question in `questions.seed.ts`:

```ts
{
  key: 'q_morning_6am',
  text: 'What does {name} do at 6 AM?',
  objective_tag: 'gym',            // gym | nutrition | mess | laundry | rent | pain_points | wtp | sleep | study | social | money | fun
  segment: 'all',                  // boys | girls | coed | all
  fun_score: 0.9,                  // 0..1, editorial
  data_value: 0.8,                 // 0..1, research importance
  sensitivity: 0,                  // 0 safe, 1 mild, 2 avoid for default pool
  options: [
    { key: 'gym', label: 'Gym 💪', image: 'q/gym.jpg' },
    { key: 'sleep', label: 'Sleeping 😴', image: 'q/sleep.jpg' },
    { key: 'chai', label: 'Chai ☕', image: 'q/chai.jpg' },
    { key: 'study', label: 'Studying 📚', image: 'q/study.jpg' }
  ]
}
```

Rules: 3–6 options per question, mutually exclusive, funny and relatable, **frequency-framed where possible** ("in a normal week…") instead of yes/no, and no option that reads like a medical or financial disclosure.

### 8.2 Research objectives (hidden inside fun)

Seed starter coverage (40+ questions, written later with me): gym habit and frequency, nutrition tracking style, mess food satisfaction, laundry routine, rent payment behavior, biggest hostel pain point (wifi, water, power cuts, noise), what they'd pay extra for (AC, better mess, laundry, gym), sleep and study rhythm, spending, social style, plus **pure-fun** questions (cartoons, desserts, fears) that carry no research objective but keep the quiz entertaining. Mix reflects Section 8.3.

### 8.3 Composition rule per quiz

Each published quiz of 10 questions should contain approximately:

- **7 pure fun** (`objective_tag = fun | social | sleep | money | …` with low research weight)
- **2–3 research** (gym, nutrition, laundry, rent, wtp, mess, pain_points)
- **≤1 hostel rating** (mess, wifi, water)

Hard cap: **never more than 3 research-tagged questions in one quiz**. Enforce on the server, not just in the UI.

### 8.4 Selection algorithm (candidate generation for the creator)

Implement in `/src/lib/selection.ts` as a **pure, testable** function.

Inputs: creator segment (boys/girls/coed), hostel/area/city, already-used keys, and current research coverage stats.

```
function buildCandidates(ctx): Question[20] {
  pool = active questions where sensitivity <= 1 and (segment == ctx.segment or 'all')

  // 1) Need score: prefer objectives with the fewest responses in this stratum
  //    stratum = city × hostel_type × (year if known)
  for q in pool where q.objective_tag is research:
    n = responsesInStratum(q.objective_tag, ctx.stratum)
    q.need = q.data_value * 1 / (1 + n / TARGET_PER_STRATUM)   // TARGET default 400
  for q in pool where fun:
    q.need = 0

  // 2) Bandit score (Thompson sampling) — reward = completion AND share contribution
  //    Beta(alpha, beta) with alpha = 1 + successes, beta = 1 + failures
  //    success = question answered through to quiz completion; failure = skipped / dropped at this question
  for q in pool:
    q.bandit = sampleBeta(1 + q.successes, 1 + q.failures)

  // 3) Final rank
  q.score = 0.5 * q.bandit + 0.3 * q.fun_score + 0.2 * q.need   (weights in config)

  // 4) Compose: take top ~14 fun, ~5 research, ~1 hostel-rating, enforce diversity (no >2 of same objective_tag
  //    among research, no near-duplicate option sets), shuffle display order
  return composeBatch(pool, {fun: 14, research: 5, rating: 1})
}
```

Notes:

- Cold start: all `successes/failures = 0` → uniform exploration, with `fun_score` as the prior.
- Retire any question whose skip rate is above a config threshold (default 40% with ≥100 impressions). Flag it in the admin dashboard rather than deleting it.
- Weights, targets and caps live in `config.ts` so I can tune them without code changes.
- The creator **chooses** their 10; this choice is itself a signal (Section 12). Do not hide or auto-pick.

### 8.5 Truth-gap analysis (data quality)

Self-reports are inflated. For each research question per hostel, compute:

- **Creator answer distribution** (what people say about themselves)
- **Friends' modal guess** per creator (what peers believe)
- **Agreement rate** (guess == creator answer)

When creator says "gym daily" but friends mostly guess "sleeping", record the discrepancy. Report both numbers; the dashboard (Section 15) must show "stated" vs "peer-perceived" side by side. Treat the sample as skewed toward socially active, smartphone-savvy students and say so on the dashboard.

---

## 9. Scoring and results

- Score = count of correct guesses (0–10), computed server-side from the stored `creator_option_id`. **Never send correct answers to the client before the attempt is finalized** (anti-cheat). Per-question feedback is revealed by the API after each answer submission.
- Implement `scoring.ts` as pure functions with tests (edge cases: skipped questions, refresh, duplicate submission, offline retry).
- **Result tiers** in `results.ts`, 5 tiers by default: 0–2, 3–4, 5–6, 7–8, 9–10. Each tier has: title, message copy (2–3 variants for repeat plays), mascot mood key, and a share caption. Draft hostel-flavored copy (e.g., 9–10 "Certified roommate 🏆", 0–2 "Stranger in Room 204"), keep it playful, never mean, and keep it easy to edit.
- Tie-break for scoreboards: higher score, then faster total time, then earlier finish.
- Players may retry once per quiz; the scoreboard shows the best score. Log retries.

---

## 10. Animation and sound hook points (build structure only)

Do **not** implement animation or audio now. Do build these seams so they plug in later:

- `RevealStage` component with explicit states: `idle → suspense → reveal → result`, driven by a small state machine (`useReveal`). Dwell times from config. Currently each state just renders static content.
- `Mascot` takes `mood` and an `animation` prop (unused for now).
- `useSound()` hook returning no-op `play(key)` / `mute()`; a sound key registry (`tap`, `correct`, `wrong`, `suspense`, `reveal.low`, `reveal.mid`, `reveal.high`, `share`). Sound is **off by default** until the user opts in, and a mute toggle exists in the UI.
- Answer feedback emits a typed UI event (`answer.correct`, `answer.wrong`) that an animation layer can subscribe to later.
- All motion must respect `prefers-reduced-motion`.
- Document the hook points in `/docs/animation-hooks.md`.

---

## 11. Funnel to Discover, Stayo and owners

### 11.1 Result-screen teaser cards (fake-door tests)

On the result screen show **one** teaser card, rotating by objective that needs more demand data:

- "🏋️ Gym streak buddy — join the waitlist"
- "🍱 Mess calorie tracker — want early access?"
- "🧺 Laundry reminders — want early access?"
- "💸 Rent reminders — want early access?"

A tap logs a `waitlist_taps` row with `feature_key`, `hostel_id`. Tap rate is a primary demand signal. Do not collect contact details at this step; the tap alone is the signal. If the tap converts to a join, ask for nothing beyond what Stayo's existing tenant sign-up requires, via a deep link.

### 11.2 Discover handoff

- Primary post-result CTA: "See how your hostel ranks in {area}" → hostel page → **Open Discover** button linking to Stayo's Discover page with `utm_source=quiz&utm_medium=result&hostel={slug}`.
- Discover link and deep-link format is configured via env var `DISCOVER_BASE_URL`. If it is unset, hide the CTA gracefully.
- Show a short, friendly "What is Stayo?" explainer sheet (3 cards: pay rent and complaints from your phone, hostel rankings, what's coming). Keep it skippable.

### 11.3 Owner channel (the real unlock)

- **Hostel Report Card** (`/report/[hostelSlug]`): aggregated tenant answers (mess rating, top complaints, wifi/water/power pain points, popular wish-list items, response count). **Hard minimum of 5 respondents** before any metric displays; below that show only "X students have played, need 5 to unlock the report".
- **"Send this to my owner/warden"** button on the hostel page for students: opens a share sheet / WhatsApp deep link with a prefilled message and the report link. **Do not auto-send anything to owners in v1**, since the student sends it from their own account.
- Owner landing page from the report link: shows the report card plus "Claim your hostel page" CTA leading to Stayo's owner demo/signup (`OWNER_SIGNUP_URL` env var).
- Optional, student-initiated: "Add your owner/warden's number so we can send them your hostel's report" → saved to `hostel_contacts` with consent record, `status = unverified`, encrypted at rest, **never displayed publicly**, never exported without admin role. This is opt-in only, and the UI must say plainly what it is used for.

---

## 12. Event tracking (implicit signals)

Write a typed event client in `events.ts`. All events carry `session_id`, `ts`, `page`, `ref`, and props below. Batch and send with `navigator.sendBeacon` where possible. Never block the UI on analytics.

| Event                                        | Key props                                       |
| -------------------------------------------- | ----------------------------------------------- |
| `landing_view`                               | ref, utm                                        |
| `start_click`                                | quiz_slug                                       |
| `name_submit`                                | length                                          |
| `hostel_pick` / `hostel_skip` / `hostel_add` | hostel_id, search_len, time_ms                  |
| `question_view`                              | quiz_id, question_key, position                 |
| `answer_submit`                              | question_key, option_key, ms_to_answer, correct |
| `quiz_complete`                              | score, total_ms                                 |
| `quiz_abandon`                               | last_position                                   |
| `result_view`                                | score, tier                                     |
| `teaser_view` / `teaser_tap`                 | feature_key                                     |
| `discover_click`                             | hostel_id, source_screen                        |
| `create_start`                               | ref                                             |
| `candidates_shown`                           | question_keys[]                                 |
| `candidate_pick` / `candidate_unpick`        | question_key, objective_tag, position_in_list   |
| `candidate_shuffle`                          | count                                           |
| `creator_answer`                             | question_key, option_key, ms                    |
| `creator_skip`                               | question_key, objective_tag                     |
| `quiz_publish`                               | total_ms, research_count                        |
| `share_click`                                | channel, quiz_id, hostel_id                     |
| `share_open`                                 | ref (on arrival from a share link)              |
| `report_view` / `report_send_owner_click`    | hostel_id                                       |
| `owner_contact_submit`                       | hostel_id (no contact data in props)            |

**What these signals mean (build the dashboard to answer these):**

- Which questions creators **choose** from 20 = revealed preference and relevance.
- **Skip rate** by objective = sensitivity or irrelevance.
- **ms_to_answer** = how personal a question is.
- **Friend guess accuracy** = how well-known a habit is.
- **Share graph** (ref chains) = how it spreads across hostels and colleges.
- **Teaser tap rate** = real demand for a feature.

---

## 13. Privacy, safety and compliance (India-first)

- **Consent:** a short, friendly consent notice before first data submission (what we collect, why, how to delete). Store `consent_at`. Comply with India's **DPDP Act 2023** principles: notice, purpose limitation, data minimization, right to erasure.
- **Age gate:** ask "Are you 18 or older?" once. If no, show a kind message and block quiz creation and data submission (play-only without storing a profile is also not allowed in v1; keep it simple). Store only the confirmation timestamp, never the date of birth.
- **No individual exposure:** owners and the public only see aggregates. A hostel page never displays an individual's quiz answers. Hostel report metrics need ≥5 respondents.
- **Health-adjacent data** (gym, nutrition): lifestyle-level only, aggregated, never tied to a named person or published at individual level.
- **Names:** treat as display names only. Don't link to real identity. Offer **delete my quiz / delete my data**, and implement it in v1.
- **Owner contact data:** opt-in, encrypted at rest, admin-only, with an opt-out path.
- **Abuse protection:** rate limit by IP and session; profanity and harassment filter on names and hostel free-text; a report/flag button on hostel entries; bot protection on publish (a lightweight challenge only if abuse appears).
- **Security:** parameterized queries via ORM, CSRF protection, secrets only via env vars, security headers, no PII in logs, no PII in analytics event props.
- **Do not** scrape personal phone numbers or buy contact lists, and do not build any of that into the product.

---

## 14. Open Graph and sharing

- Every `/q/[slug]` and result page has dynamic OG tags: title ("Will {creator} block you?" or "I scored {x}/10 on {creator}'s quiz"), description and a generated OG image (`next/og`) using mascots from the asset manifest and the Stayo palette.
- Share actions: copy link, WhatsApp deep link with a prefilled caption, native share sheet (Web Share API), and "save image" for Stories.
- Links must preview correctly on WhatsApp, Instagram and Telegram.
- Each shared link includes `?ref=` (Section 7.1).

---

## 15. Admin and analytics dashboard (`/admin`)

Protected by role-based auth (env-configured admin allowlist is fine for v1). Pages:

1. **Funnel:** landing → start → complete → result → create_start → publish → share → share_open, with drop-off per step and per question.
2. **Virality:** K-factor (new quizzes created per quiz played), play→create conversion, spread by hostel/college/area.
3. **Research:** per objective, per stratum (city × hostel type): response counts, distributions, **stated vs peer-perceived** (Section 8.5), confidence intervals, and a "responses still needed" counter against the target (default 400 per segment).
4. **Question health:** impressions, pick rate, skip rate, completion rate, bandit posterior, retire/flag toggles.
5. **Hostels:** database size, claimed vs unclaimed, merge queue, contact opt-ins.
6. **Feature decision panel:** for each candidate feature (gym tracker, nutrition tracker, laundry, rent reminders) show the key metrics versus **thresholds I set in config** (e.g., ≥30% report weekly gym and ≥20% teaser tap rate). Output a simple "build / wait / drop" indicator with the evidence beside it. Never present numbers without sample size.

---

## 16. Build plan and definition of done

Work in these phases. After each phase, summarize what's done, what's next, and what you need from me. Commit in small, well-named commits.

**Phase 0 — Setup:** inspect the repo, scaffold the app, theme tokens, asset manifest, CI, lint/test setup, env example (`DISCOVER_BASE_URL`, `OWNER_SIGNUP_URL`, DB, admin allowlist). Ask me for brand assets and reference screens if they're not yet in `/public/brand`.

**Phase 1 — Core loop (MVP):** sessions, consent and age gate, question bank seed (starter set; I'll provide more), creator flow, publish, share link, player flow, server-side scoring, suspense stage (static), result tiers, creator scoreboard, event tracking.
_Done when:_ I can create a quiz in under 2 minutes, share a link, have a friend play it, and both of us see correct scores, with all events recorded.

**Phase 2 — Hostel layer:** hostel search/add/dedupe, hostel pages and leaderboards, hostel-level and area-level rankings, OG images, referral tracking.

**Phase 3 — Research engine:** selection algorithm with need-based sampling and bandit, composition caps, truth-gap analysis, admin dashboards, teaser cards and waitlist taps.

**Phase 4 — Owner funnel:** report card with k-anonymity, "send to owner" share flow, owner landing page, opt-in contact capture, Discover handoff with UTMs.

**Phase 5 — Polish and hardening:** accessibility pass, performance budget, abuse protection, data deletion flows, load test, then (later, on my signal) animations and sound.

**Global definition of done for any task:** types pass, tests pass, lint clean, events emitted, no hard-coded copy or colors, accessible, works at 360px wide, and the empty/loading/error states exist.

---

## 17. Working agreements (how you should work with me)

- **Start by reading the repo** and this file, then show me a short plan (≤15 lines) before heavy implementation. Ask only blocking questions, and batch them.
- Prefer boring, well-understood solutions over clever ones. Keep dependencies minimal.
- Write pure functions for anything with logic (scoring, selection, aggregation) and test them.
- Content goes in content files. If you need to invent placeholder copy or questions, mark them with `// TODO(content)` so I can replace them.
- Never fake data in the dashboard. Use seed scripts clearly labeled as dev data.
- If a requirement would make the game feel like a survey, or would expose individuals to owners, push back and propose an alternative.
- If something is ambiguous and low-risk, make the sensible choice, note it in `/docs/decisions.md`, and keep going.
- Keep `/docs/decisions.md` updated with major choices and `/docs/animation-hooks.md` with the animation seams.

## 18. Out of scope for now

Animations and sound effects (hooks only), payments, push notifications, automated messaging to owners, native mobile apps, user accounts for players, machine-learning personalization beyond the bandit, and any scraping of third-party hostel data.
