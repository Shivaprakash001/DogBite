// Mirror of the colour tokens in tokens.css for code that can't read CSS variables
// (next/og image generation). tests/unit/misc.test.ts fails if they drift.
export const THEME = {
  colors: {
    clay: '#b46a55',
    terracotta: '#a45d44',
    'terracotta-deep': '#7e4331',
    dusty: '#d2986c',
    latte: '#ebd9c4',
    charcoal: '#2f2f2f',
    cream: '#f7f3ee',
    paper: '#fffdf9',
    sand: '#f1e6d8',
    line: '#e3d3c0',
    'ink-soft': '#6b5f57',
    marigold: '#f2b33d',
    'marigold-deep': '#c98a17',
    correct: '#2e7d4f',
    wrong: '#c23b3b',
  },
} as const;
