// All UI strings. English first; Hindi and Telugu fall back to English key by key.
// Placeholders use {curly} names and are filled by fmt().
// TODO(content): copy is a first draft.

const en = {
  brand: {
    product: 'Roomie Quiz',
    by: 'by Stayo',
  },
  common: {
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    close: 'Close',
    loading: 'Loading…',
    retry: 'Try again',
    copy: 'Copy link',
    copied: 'Link copied!',
    error: 'Oops, something broke. Try again?',
    offline: "You're offline. We'll retry when you're back.",
    sound: 'Sound',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    language: 'Language',
    privacy: 'Privacy & your data',
    you: 'you',
    points: 'pts',
  },
  landing: {
    kicker: 'The hostel friendship test',
    headline: 'Will your roomie block you?',
    sub: 'Make a 10-question quiz about your hostel life in 2 minutes. Send it to your gang. See who really knows you.',
    cta: 'Make my quiz',
    howTitle: 'How it works',
    how: [
      { emoji: '✍️', text: 'Pick 10 questions & answer them' },
      { emoji: '📲', text: 'Share the link with your hostel gang' },
      { emoji: '🏆', text: 'Watch the scoreboard (and your hostel rank)' },
    ],
    boardTitle: 'Hostels playing right now',
    boardEmpty: 'No hostels on the board yet. Yours could be first 👀',
    boardCta: 'See the Hostel Face-off',
  },
  gate: {
    title: 'Quick vibe check',
    body: 'We keep this fun and safe. We store your display name, your answers and which hostel you pick, only to run the game and to make hostel life better (in aggregate, never you personally). You can delete everything anytime.',
    ageQuestion: 'Are you 18 or older?',
    yes: "Yes, I'm 18+",
    no: "No, I'm under 18",
    privacyLink: 'What we collect & how to delete it',
    minorTitle: 'Come back in a bit 💛',
    minorBody: "Roomie Quiz is for students who are 18 or older. Thanks for being honest. We haven't saved anything about you.",
  },
  name: {
    titleCreator: "What's your name?",
    titlePlayer: "What's your name?",
    hintPlayer: '{creator} will see this on the scoreboard',
    hintCreator: 'Your friends will see this',
    placeholder: 'Your name',
    errorEmpty: 'Type a name first',
    errorEmoji: 'Add at least one letter 🙂',
    errorProfane: "Let's keep it friendly. Try another name?",
    cta: 'Continue',
  },
  mascot: {
    title: 'Pick your buddy',
    sub: 'This sets how questions talk about you',
    he: { label: 'Cap Pup', pronoun: 'he / him' },
    she: { label: 'Bow Pup', pronoun: 'she / her' },
    they: { label: 'Bandana Pup', pronoun: 'they / them' },
  },
  hostel: {
    title: 'Join your hostel’s leaderboard',
    sub: 'Your hostel climbs the Face-off every time someone plays',
    searchPlaceholder: 'Search your hostel',
    cityLabel: 'City',
    noResults: 'No match yet',
    addCta: "Can't find mine → add it",
    skip: 'Skip, play solo',
    addTitle: 'Add your hostel',
    addName: 'Hostel name',
    addArea: 'Area',
    addAreaOther: 'My area is not listed',
    addAreaFree: 'Type your area',
    addType: 'Who lives there?',
    types: { boys: 'Boys', girls: 'Girls', coed: 'Co-ed', unknown: 'Not sure' },
    addCollege: 'Nearest college (optional)',
    addSubmit: 'Add hostel',
    dupTitle: 'Is it one of these?',
    dupSub: 'Looks like someone already added it',
    dupNone: 'No, mine is different',
    errorName: 'Hostel name looks off. Try again?',
    picked: 'Playing for {hostel}',
    change: 'Change',
  },
  creator: {
    pickTitle: 'Pick 10 questions',
    pickSub: 'Tap the ones your friends should guess',
    pickedCount: '{n}/10 picked',
    shuffle: 'Shuffle for more',
    shufflesLeft: '{n} left',
    researchCap: 'Max 3 hostel-life questions per quiz. Keep it spicy with fun ones 🌶️',
    ratingCap: 'Just one hostel rating per quiz',
    pickDone: 'Answer them →',
    answerTitle: 'Your answer',
    answerHint: 'Only you know this. Friends will have to guess.',
    answerProgress: '{n}/10',
    skipQuestion: 'Swap this question',
    publish: 'Publish my quiz',
    publishing: 'Publishing…',
    resumeToast: 'Welcome back! Picking up where you left off.',
    categories: {
      research: 'Hostel life',
      rating: 'Hostel rating',
      sleep: 'Sleep',
      study: 'Study',
      social: 'Social',
      money: 'Money',
      fun: 'Just fun',
    },
  },
  done: {
    title: 'Your quiz is live! 🎉',
    sub: 'Send it to your hostel gang and see who knows you best.',
    whatsapp: 'Send on WhatsApp',
    share: 'Share…',
    story: 'Save image for Stories',
    board: 'See who played',
    caption: 'Will you get blocked? 😤 Take my hostel quiz: {url}',
    deleteQuiz: 'Delete this quiz',
    deleteConfirm: 'Delete your quiz? Friends won’t be able to play it anymore.',
    deleted: 'Quiz deleted',
  },
  quizLanding: {
    title: 'Will {creator} block you?',
    sub: '10 questions about {creator}’s hostel life. Guess right or get blocked 😤',
    start: 'Start quiz',
    playedAlready: 'You scored {score}/10 already',
    retry: 'Retry once',
    viewResult: 'See my result',
    ownQuiz: "This is your quiz! Share it and watch the board.",
    ownQuizCta: 'Share my quiz',
    notFound: 'This quiz has vanished 👻',
    notFoundSub: 'It may have been deleted. Make your own instead?',
    boardTitle: 'Scoreboard',
    boardEmpty: 'Nobody has played yet. Be the first!',
    from: 'from {hostel}',
  },
  play: {
    questionOf: '{n}/10',
    correct: 'Correct!',
    wrong: 'Nope!',
    noRetries: "You've used your retry. Your best score is on the board.",
  },
  suspense: {
    lines: ['Just look at my score 🫣', 'Counting your right answers…', 'Moment of truth…'],
  },
  result: {
    scoreLabel: 'Your score',
    yourTurn: "Now it's your turn",
    createCta: 'Create your own quiz',
    playCta: 'Take this quiz',
    hostelCta: 'See how your hostel ranks in {area}',
    hostelCtaNoArea: 'See your hostel’s rank',
    share: 'Share my score',
    viewBoard: 'Full scoreboard',
    sharedTitle: '{player} scored {score}/10 on {creator}’s quiz',
    teaserThanks: "You're on the list! 🎉",
    teaserLink: 'Get early access on Stayo',
  },
  board: {
    title: "{creator}'s scoreboard",
    rank: 'Rank',
    empty: 'No players yet',
    shareMore: 'Share to get more players',
  },
  hostelPage: {
    rank: '#{rank} in {area}',
    unranked: 'Not ranked yet',
    players: '{n} players',
    quizzes: '{n} quizzes',
    topQuizzes: 'Most-played quizzes',
    topGuessers: 'Sharpest friends',
    funStats: 'Hostel vibes',
    funLocked: '{n} students have played. Need {k} to unlock hostel vibes.',
    statLine: '{pct}% say “{label}” for: {question}',
    reportCta: 'Hostel Report Card',
    sendOwner: 'Send this to my owner / warden',
    sendOwnerMsg: "Hi! Students at {hostel} have been rating hostel life on Roomie Quiz. Here's our hostel report card: {url}",
    discover: 'Open Stayo Discover',
    flag: 'Report this hostel entry',
    flagged: 'Thanks, we’ll take a look',
    empty: 'No one from this hostel has played yet.',
    playCta: 'Make a quiz for this hostel',
  },
  faceoff: {
    title: 'Hostel Face-off',
    sub: 'Rankings in {area}',
    subAll: 'Top hostels everywhere',
    empty: 'No hostels here yet. Be the first to put yours on the map!',
    points: '{n} pts',
    areaPicker: 'Pick an area',
  },
  report: {
    title: '{hostel} Report Card',
    sub: 'What students say, in aggregate. No names, ever.',
    locked: '{n} students have played, need {k} to unlock the report.',
    respondents: 'Based on {n} students',
    mess: 'Mess food rating',
    painPoints: 'Top complaints',
    wishList: 'Most-wanted upgrades',
    laundry: 'Laundry routine',
    wifi: 'WiFi rating',
    sendOwner: 'Send to my owner / warden',
    ownerTitle: 'Run this hostel?',
    ownerBody: 'Stayo helps owners collect rent, track complaints and climb the hostel rankings.',
    ownerCta: 'Claim your hostel page',
    contactTitle: 'Want us to send this to your owner?',
    contactBody: "Add your owner/warden's number and we'll share this report with them once. We use it only for that, keep it encrypted, never show it publicly, and they can opt out anytime.",
    contactName: 'Their name (optional)',
    contactPhone: 'Phone number',
    contactRelation: 'They are the…',
    relations: { owner: 'Owner', warden: 'Warden', manager: 'Manager', unknown: 'Not sure' },
    contactConsent: 'I have their OK to share this number, or it is publicly posted at the hostel.',
    contactSubmit: 'Save number',
    contactDone: 'Saved. Thank you! 💛',
    sampleNote: 'Sample skews toward students who play quizzes on their phone.',
  },
  stayo: {
    whatIs: 'What is Stayo?',
    cards: [
      { emoji: '📱', title: 'Hostel life on your phone', body: 'Pay rent and raise complaints without chasing the warden.' },
      { emoji: '🏆', title: 'Hostel rankings', body: 'See how hostels in your area really compare, from students.' },
      { emoji: '✨', title: "What's coming", body: 'Gym buddies, mess menus, laundry reminders. You vote with your taps.' },
    ],
    discover: 'Explore hostels on Stayo',
  },
  privacy: {
    title: 'Privacy & your data',
    intro: 'Roomie Quiz is built so nobody (not owners, not wardens, not other students) can see your personal answers.',
    collectTitle: 'What we collect',
    collect: [
      'A random session id in a cookie (no login, no phone, no email)',
      'Your display name and the answers you give in quizzes',
      'The hostel you pick, if you pick one',
      'How you use the game (taps, timings) to make it better',
    ],
    whyTitle: 'Why',
    why: 'To run the game, rank hostels, and understand hostel life in aggregate so Stayo can build better features. Hostel stats only appear once 5 or more students have answered.',
    deleteTitle: 'Delete my data',
    deleteBody: 'This deletes your quizzes, scores, answers and activity from this device’s session. It cannot be undone.',
    deleteCta: 'Delete everything',
    deleteConfirm: 'Delete all your Roomie Quiz data? This cannot be undone.',
    deleted: 'Done. Your data has been deleted.',
    myQuizzes: 'Your quizzes',
    noQuizzes: 'You have not made a quiz yet.',
    contact: 'Questions? Write to privacy@stayo.in',
  },
  footer: {
    madeBy: 'Made with 🧡 by Stayo',
    faceoff: 'Hostel Face-off',
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { readonly [K in keyof T]: Widen<T[K]> };
type DeepPartial<T> = T extends string ? string : T extends readonly unknown[] ? T : { [K in keyof T]?: DeepPartial<T[K]> };

export type Copy = Widen<typeof en>;
export const LOCALES = ['en', 'hi', 'te'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' };

// TODO(content): translations. Structure is ready; untranslated keys fall back to English.
const hi: DeepPartial<Copy> = {};
const te: DeepPartial<Copy> = {};
const partials: Record<Locale, DeepPartial<Copy>> = { en: {}, hi, te };

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (over === undefined) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return (over as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    out[k] = merge((base as Record<string, unknown>)[k], v as never);
  }
  return out as T;
}

const cache = new Map<Locale, Copy>();
export function getCopy(locale: Locale = 'en'): Copy {
  let c = cache.get(locale);
  if (!c) {
    c = merge<Copy>(en, partials[locale]);
    cache.set(locale, c);
  }
  return c;
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Fill {placeholders}. Unknown placeholders are left as-is so they are easy to spot. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
