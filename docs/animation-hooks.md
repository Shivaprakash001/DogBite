# Animation and sound hook points

Animation and audio are deferred (§10). These seams exist so they can be added without refactoring. Everything must keep working with
`prefers-reduced-motion: reduce` (globals.css already zeroes transition and animation durations).

## Reveal state machine

- `src/hooks/useReveal.ts`: `idle → suspense → reveal → result`. Dwell times come from `TIMING.reveal` in `src/config.ts`.
  `suspense` waits for both its minimum dwell **and** the server score, so a slow network extends suspense instead of skipping it.
- `src/components/quiz/RevealStage.tsx` renders each stage as static content today and exposes `data-stage="<stage>"` on its root. Animate with CSS
  keyed on `[data-stage]`, or subscribe to the `reveal.stage` UI event.
- Mascot moods per stage: suspense = `pulling` (the rope pull) + `shocked`; reveal/result = the tier's mood from `src/content/results.ts`.

## Verdict scene (implemented with light CSS)

- `src/components/scene/VerdictScene.tsx` renders the guard pup's reaction on the result page; root has `data-verdict="chase|growl|sniff|friendly|love"`.
- Keyframes live in `src/app/globals.css` (`.anim-chase`, `.anim-hop`, `.anim-hop-slow`, `.anim-wiggle`, `.anim-float`, `.anim-board-drop`).
  Under `prefers-reduced-motion: reduce` they are removed entirely so the static composition shows.
- Live guard mood during play: `src/components/scene/GuardStatus.tsx`, driven by `guardState(correct, wrong)`.

## Mascot and characters

- `<Character avatar mood animation />` (`src/components/ui/Character.tsx`) and `<Mascot mood animation />` (the guard pup). `animation` is reserved and rendered as `data-animation`; `data-mood` is set
  too. The SVGs have named groups (`head-group`, `tail`, `ear-left`, `eye-left`, `mouth`, …) that are useful animation targets once the SVG is
  inlined.

## UI events

`src/lib/events.ts` exposes a tiny pub/sub, separate from analytics:

| Event                             | Fired when                        | Detail         |
| --------------------------------- | --------------------------------- | -------------- |
| `answer.correct` / `answer.wrong` | the server returns a guess result | `{ position }` |
| `reveal.stage`                    | the reveal machine changes stage  | the stage name |
| `tap`                             | reserved                          | —              |

```ts
import { onUiEvent } from '@/lib/events';
const off = onUiEvent('answer.correct', ({ position }) => confetti(position));
```

## Sound

- `src/hooks/useSound.tsx`: `play(key)` is a no-op, `mute()`, `enabled`, `setEnabled()`. Off by default; the header toggle is the opt-in and it
  persists per device.
- Keys: `tap`, `correct`, `wrong`, `suspense`, `reveal.low`, `reveal.mid`, `reveal.high`, `share`. They are already called at the right moments
  (answer taps, feedback, reveal by tier, share actions). Implement playback inside `play()` with a key → file registry.

## Timing constants

`TIMING.answerFeedbackMs` (feedback before auto-advance), `TIMING.creatorAdvanceMs`, `TIMING.reveal.*` in `src/config.ts`.
