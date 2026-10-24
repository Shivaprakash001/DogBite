# Decisions log

Short, dated notes on choices made while building Roomie Quiz. Newest at the bottom of each section.

## Stack and structure (2026-10-24)

- **Rebuilt from the Vite prototype into Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + Drizzle/Postgres + Zod.** The old prototype was a
  single-player personality quiz with no backend; the brief needs server-side scoring, a database, OG images and an admin. The prototype stays in git
  history; its hostel-life humour and the dog expressions (sad, shocked, confused, pulling) were carried over.
- **Cache Components + Partial Prefetching are on** (Next 16 defaults). Every page renders a static shell instantly and streams the session/DB parts inside
  `<Suspense>`. Rules that follow from this: read `params`/`cookies`/DB only inside Suspense; call `await connection()` before `Date.now()`/`Math.random()` in
  server components; route-handler wrappers must `unstable_rethrow` Next's control-flow errors.
- **REST route handlers instead of server actions** for every write. The contracts in `src/lib/api-types.ts` are what a FastAPI port would keep.
- **`proxy.ts`** (Next 16's renamed middleware) only sets cookies: anonymous session id, first-touch `ref` and `utm_source`. No DB work in the proxy.
- **Postgres-backed rate limiting** (`rate_limits` table, fixed window). No Redis needed for v1; swap `src/server/rate-limit.ts` if traffic grows.
  Limits are **per session first; per-IP limits are a loose backstop** sized for a whole hostel behind one Wi-Fi NAT (an early version used
  equal limits and would have blocked a hostel of friends playing at once).
- **Local dev DB** runs in a container (`podman`/`docker`, port 54329). Any managed Postgres with `pg_trgm` works in production.

## Product and content

- **2026-10-24 — Hook and cast changed (chat request, overrides §3/§6 defaults).** The hook is now _“Will {name} kick you out of the room?”_
  with the kicker “Roommate compatibility test”, and scores read as compatibility % with room verdicts (Kicked out → Bunk-bed soulmates).
  Main characters are a **boy and a girl** (`src/content/characters.ts`, drawn from parts in code until commissioned art exists;
  `character.<avatar>.<mood>` keys in the asset manifest override them). The **Stayo pup is now the creator's room guard** (named Sheru,
  `TODO(content)`): it reacts live while a friend plays (`guardState` in `lib/scoring.ts`), pulls the rope that drops the scoreboard in the
  reveal, and on the result either chases the player out (very low score), growls, sniffs, wags, or showers them with love (high score).
  Players also pick their character, one tap on the name screen, so they can see themselves being chased or hugged.
- **Light CSS motion for the verdict** (chase, hop, wiggle, floating hearts, board drop) is the first use of the animation seams, because
  the dog's reaction is now the payoff of the game. Reduced-motion users get the static composition (animations removed, not shortened).
- **Pronouns are separate from character art:** the creator picks boy/girl art, pronouns default to he/she, with a “use they/them” toggle.

- ~~One mascot, three accessories~~ (superseded the same day by the boy/girl characters above).
- **Emoji tiles instead of photos** for answer cards. No licensed photos exist yet, and emoji keep the quiz screen light (perf budget §2.3).
  `PhotoCard` renders `/public/questions/<image>` automatically when an option gets an `image` in the seed.
- **Creators see questions in the third person** ("What does Ravi do at 6 AM?"), exactly as friends will. One template per question, fewer strings.
- **Research questions carry a "Hostel life" chip** in the picker so the 3-per-quiz cap can be explained in a friendly toast. It reads as a category,
  not a survey label. Ratings get "Hostel rating".
- **Question bank: 51 questions** (`TODO(content)` marked). 21 research-tagged (18 research + 3 hostel ratings), 30 fun. One sensitivity-2 question exists to prove the
  filter; it is never offered.
- **Composition caps are enforced on the server** in `confirmPicks`, `skipQuestion` (replacement respects caps) and `publishDraft`.
- **Points for the Hostel Face-off:** 3 per live quiz made by residents + 1 per finished play by residents.

## Data, privacy and safety

- **Share links never contain the session id.** The brief suggested `?ref=<sessionId>`, but the session id is the anonymous auth credential: anyone
  with the link could act as that user. Each session has a public `share_ref` instead; `ref` resolves either a `share_ref` or a quiz slug.
- **Consent and the 18+ question are one screen**, shown right before the first data submission (never before the Start CTA). Under-18s get a kind
  stop and only a `sq_minor` cookie; nothing else is stored.
- **Anonymous analytics before consent.** Page-view style events (landing_view, share_open) are recorded with the random session id only, no PII.
  Every personal write (names, answers, hostels, contacts) requires consent.
- **k-anonymity:** every public aggregate needs ≥5 respondents per metric (not just per hostel), counts one answer per respondent (their latest quiz),
  and percentages are rounded to 5% steps.
- **Report card uses creators' self-reports only.** Friends' guesses are about the creator, not about the friend's own hostel life.
- **Owner contacts:** AES-256-GCM at rest, keyed hash for dedupe, never displayed (the admin sees counts only). Export is deliberately not built.
- **Delete my quiz** removes it from play and erases the creator's answers. **Delete my data** erases every row tied to the session (including other
  players' attempts on the deleted quizzes); hostels the session added stay but lose the link.
- **Flagging a hostel** doesn't need consent (not personal data); 5 flags auto-hide unless verified.
- **Admin auth v1:** env allowlist of keys (`ADMIN_KEYS`), signed cookie containing key id + expiry, so removing a key revokes sessions. Login is
  rate limited to 5/hour per IP.
- **No CSP header yet.** A strict CSP needs per-request nonces, which forces every page fully dynamic and gives up the static shells. Other security
  headers are set in `next.config.ts`. Revisit with hashes or nonces if a third-party script is ever added.

## Research engine

- **Bandit evidence is creator-side:** impression when shown, success when published in a quiz, failure on swap/skip, plus a failure when a player
  abandons at that question (counted once per session per quiz, only with a real unfinished attempt). Player completions are not counted as successes:
  they'd add 10 successes per play and swamp the creator signal.
- **Need score strata** = city × hostel type. Creators without a hostel form their own stratum.
- **Truth gap:** perceived = each creator's friends' modal guess (ties go to the stated answer). Friends only ever choose between the true answer and
  one distractor, so the dashboard says so next to the numbers.
- **Feature decisions** use the brief's thresholds as defaults in `config.ts`, with a minimum sample of 100 before any build/wait/drop call.

## Internationalisation

- All strings are in `src/content/copy.ts`. Hindi and Telugu objects exist and fall back to English key by key. The language switcher stores the
  choice; client components re-render immediately. Server components still render English: when translations land, have them read the `sq_locale`
  cookie (they're already inside Suspense, so that won't cost the static shell).

## Testing

- Vitest covers the pure logic (scoring, selection/bandit/caps, aggregation/k-anonymity/truth gap, moderation incl. false positives on common Indian
  names, hostel normalisation, theme-token sync). Playwright covers the critical loop: create → share → play → result → board.
