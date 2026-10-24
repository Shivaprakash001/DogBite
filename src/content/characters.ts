// Human characters (boy / girl), drawn as SVG from parts so every mood stays
// on-model. One string source shared by the <Character> component and the OG
// image renderer. 300×300 space, feet near y≈285. Replace with commissioned art
// later by pointing the asset manifest at files (see content/assets.ts).

export const AVATARS = ['boy', 'girl'] as const;
export type Avatar = (typeof AVATARS)[number];

export const CHARACTER_MOODS = ['idle', 'waving', 'happy', 'thinking', 'nervous', 'running', 'celebrating', 'sad'] as const;
export type CharacterMood = (typeof CHARACTER_MOODS)[number];

export function isAvatar(v: unknown): v is Avatar {
  return v === 'boy' || v === 'girl';
}

const SKIN = '#D9A27A';
const SKIN_SHADE = '#C68B63';
const INK = '#2F2F2F';
const BLUSH = '#E8837E';
const WHITE = '#FFFDF9';

const LOOK: Record<Avatar, { hair: string; top: string; topShade: string; bottom: string; shoe: string; accent: string }> = {
  boy: { hair: '#2F2F2F', top: '#F2B33D', topShade: '#C98A17', bottom: '#4A5568', shoe: '#2F2F2F', accent: '#FFFDF9' },
  girl: { hair: '#3A2A24', top: '#6E9C8F', topShade: '#4F7A6E', bottom: '#3F4A63', shoe: '#A45D44', accent: '#F2B33D' },
};

type Pt = [number, number];
interface ArmPose {
  elbow: Pt;
  hand: Pt;
}

const SHOULDER_L: Pt = [114, 184];
const SHOULDER_R: Pt = [186, 184];

const ARMS: Record<CharacterMood, [ArmPose, ArmPose]> = {
  idle: [
    { elbow: [102, 208], hand: [104, 236] },
    { elbow: [198, 208], hand: [196, 236] },
  ],
  happy: [
    { elbow: [96, 204], hand: [86, 228] },
    { elbow: [204, 204], hand: [214, 228] },
  ],
  waving: [
    { elbow: [102, 208], hand: [104, 236] },
    { elbow: [222, 170], hand: [226, 122] },
  ],
  thinking: [
    { elbow: [102, 208], hand: [104, 236] },
    { elbow: [204, 214], hand: [168, 160] },
  ],
  nervous: [
    { elbow: [108, 220], hand: [140, 200] },
    { elbow: [192, 220], hand: [160, 200] },
  ],
  running: [
    { elbow: [92, 194], hand: [80, 166] },
    { elbow: [204, 212], hand: [226, 196] },
  ],
  celebrating: [
    { elbow: [92, 160], hand: [80, 116] },
    { elbow: [208, 160], hand: [220, 116] },
  ],
  sad: [
    { elbow: [110, 212], hand: [116, 238] },
    { elbow: [190, 212], hand: [184, 238] },
  ],
};

const HEAD_TILT: Partial<Record<CharacterMood, string>> = {
  thinking: 'rotate(7 150 110)',
  sad: 'rotate(-5 150 110) translate(0 4)',
  running: 'rotate(-6 150 110)',
  celebrating: 'rotate(-3 150 110)',
};

function arm([sx, sy]: Pt, { elbow, hand }: ArmPose, color: string): string {
  return `<path d="M${sx} ${sy} Q${elbow[0]} ${elbow[1]} ${hand[0]} ${hand[1]}" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
<circle cx="${hand[0]}" cy="${hand[1]}" r="9.5" fill="${SKIN}"/>`;
}

function legs(mood: CharacterMood, c: (typeof LOOK)[Avatar]): string {
  if (mood === 'running') {
    return `<path d="M140 232 Q116 248 104 270" stroke="${c.bottom}" stroke-width="20" fill="none" stroke-linecap="round"/>
<path d="M162 232 Q180 256 206 258" stroke="${c.bottom}" stroke-width="20" fill="none" stroke-linecap="round"/>
<ellipse cx="96" cy="276" rx="15" ry="8" fill="${c.shoe}" transform="rotate(-20 96 276)"/>
<ellipse cx="214" cy="262" rx="15" ry="8" fill="${c.shoe}" transform="rotate(25 214 262)"/>`;
  }
  const spread = mood === 'celebrating' ? 6 : 0;
  return `<rect x="${128 - spread}" y="226" width="19" height="52" rx="9" fill="${c.bottom}"/>
<rect x="${153 + spread}" y="226" width="19" height="52" rx="9" fill="${c.bottom}"/>
<ellipse cx="${136 - spread}" cy="282" rx="16" ry="8" fill="${c.shoe}"/>
<ellipse cx="${164 + spread}" cy="282" rx="16" ry="8" fill="${c.shoe}"/>`;
}

function torso(avatar: Avatar, c: (typeof LOOK)[Avatar]): string {
  if (avatar === 'boy') {
    // Hoodie with pocket and drawstrings.
    return `<path d="M108 236 Q104 182 150 172 Q196 182 192 236 Z" fill="${c.top}"/>
<path d="M126 216 Q150 224 174 216 L170 234 L130 234 Z" fill="${c.topShade}"/>
<path d="M140 176 L138 196 M160 176 L162 196" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>`;
  }
  // Kurti-style top, A-line, with a neckline trim.
  return `<path d="M106 244 Q104 182 150 172 Q196 182 194 244 Z" fill="${c.top}"/>
<path d="M134 176 Q150 196 166 176" stroke="${c.accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M108 236 Q150 246 192 236" stroke="${c.topShade}" stroke-width="4" fill="none"/>`;
}

function hairBack(avatar: Avatar, c: (typeof LOOK)[Avatar]): string {
  if (avatar === 'boy') return '';
  return `<path d="M90 96 Q84 168 98 196 Q110 206 118 190 L120 120 Z" fill="${c.hair}"/>
<path d="M210 96 Q216 168 202 196 Q190 206 182 190 L180 120 Z" fill="${c.hair}"/>`;
}

function hairFront(avatar: Avatar, c: (typeof LOOK)[Avatar]): string {
  if (avatar === 'boy') {
    return `<path d="M91 104 Q86 44 150 38 Q214 44 209 104 Q204 80 188 72 Q178 86 160 76 Q148 90 130 78 Q112 88 100 80 Q94 90 91 104 Z" fill="${c.hair}"/>`;
  }
  return `<path d="M90 108 Q86 40 150 36 Q214 40 210 108 Q202 70 176 64 Q150 84 118 70 Q98 80 90 108 Z" fill="${c.hair}"/>
<circle cx="190" cy="66" r="8" fill="${c.accent}"/><circle cx="200" cy="74" r="5" fill="${c.accent}"/>`;
}

function face(mood: CharacterMood): string {
  const blush = `<ellipse cx="116" cy="128" rx="10" ry="6" fill="${BLUSH}" opacity="0.45"/><ellipse cx="184" cy="128" rx="10" ry="6" fill="${BLUSH}" opacity="0.45"/>`;
  const dotEyes = (dx = 0, dy = 0, r = 6.5) =>
    `<circle cx="${128 + dx}" cy="${110 + dy}" r="${r}" fill="${INK}"/><circle cx="${172 + dx}" cy="${110 + dy}" r="${r}" fill="${INK}"/>
<circle cx="${130 + dx}" cy="${108 + dy}" r="2" fill="${WHITE}"/><circle cx="${174 + dx}" cy="${108 + dy}" r="2" fill="${WHITE}"/>`;
  const happyEyes = `<path d="M119 112 Q128 102 137 112 M163 112 Q172 102 181 112" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const sadEyes = `<path d="M120 108 Q128 116 136 108 M164 108 Q172 116 180 108" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const wideEyes = `<circle cx="128" cy="110" r="10" fill="${WHITE}" stroke="${INK}" stroke-width="3"/><circle cx="172" cy="110" r="10" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>
<circle cx="128" cy="111" r="4.5" fill="${INK}"/><circle cx="172" cy="111" r="4.5" fill="${INK}"/>`;
  const brows = (shape: 'normal' | 'worried' | 'raised') =>
    shape === 'worried'
      ? `<path d="M116 94 Q126 88 138 92 M162 92 Q174 88 184 94" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round" transform="rotate(0)"/>
<path d="M118 92 L136 88 M164 88 L182 92" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
      : shape === 'raised'
        ? `<path d="M118 94 Q128 90 138 94" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M162 88 Q172 82 182 88" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        : `<path d="M118 95 Q128 90 138 95 M162 95 Q172 90 182 95" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  const sweat = `<path d="M206 84 Q200 96 206 102 Q212 96 206 84 Z" fill="#7BB6E8"/>`;

  switch (mood) {
    case 'idle':
      return `${brows('normal')}${dotEyes()}${blush}<path d="M138 132 Q150 142 162 132" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'waving':
    case 'happy':
    case 'celebrating':
      return `${brows('normal')}${happyEyes}${blush}<path d="M132 128 Q150 152 168 128 Z" fill="${INK}"/><path d="M140 138 Q150 148 160 138 Q150 142 140 138 Z" fill="${BLUSH}"/>`;
    case 'thinking':
      return `${brows('raised')}${dotEyes(4, -3, 6)}${blush}<path d="M142 136 Q152 132 160 136" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="214" cy="60" r="5" fill="#EBD9C4"/><circle cx="226" cy="44" r="7" fill="#EBD9C4"/><circle cx="244" cy="26" r="10" fill="#EBD9C4"/>`;
    case 'nervous':
      return `${brows('worried')}${dotEyes(0, 0, 5)}${blush}<path d="M136 136 Q141 131 146 136 Q151 141 156 136 Q161 131 166 136" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>${sweat}`;
    case 'running':
      return `${brows('worried')}${wideEyes}<ellipse cx="150" cy="138" rx="9" ry="12" fill="${INK}"/>${sweat}<path d="M214 70 Q206 80 212 86 Q218 80 214 70 Z" fill="#7BB6E8"/>`;
    case 'sad':
      return `${brows('worried')}${sadEyes}${blush}<path d="M138 140 Q150 130 162 140" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M122 120 Q118 130 122 134 Q126 130 122 120 Z" fill="#7BB6E8"/>`;
  }
}

function extras(mood: CharacterMood): string {
  if (mood === 'celebrating') {
    return `<path d="M56 96 l6 -12 l6 12 l12 6 l-12 6 l-6 12 l-6 -12 l-12 -6 Z" fill="#F2B33D"/><path d="M236 92 l4 -8 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 Z" fill="#F2B33D"/>`;
  }
  if (mood === 'waving')
    return `<path d="M244 108 Q252 120 244 132 M254 102 Q264 120 254 138" stroke="#D2986C" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (mood === 'running') {
    return `<path d="M236 150 L276 150 M240 172 L286 172 M232 194 L270 194" stroke="#D2986C" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`;
  }
  return '';
}

/** Inner SVG markup (no <svg> wrapper) for a character in a mood. Static, first-party strings only. */
export function characterMarkup(avatar: Avatar, mood: CharacterMood): string {
  const c = LOOK[avatar];
  const [la, ra] = ARMS[mood];
  // A hand on the chin has to sit in front of the head.
  const rightArmOverHead = mood === 'thinking';
  const body = `${legs(mood, c)}${torso(avatar, c)}
<rect x="140" y="158" width="20" height="20" rx="6" fill="${SKIN_SHADE}"/>
${arm(SHOULDER_L, la, c.top)}${rightArmOverHead ? '' : arm(SHOULDER_R, ra, c.top)}`;
  const head = `${hairBack(avatar, c)}
<circle cx="92" cy="114" r="11" fill="${SKIN_SHADE}"/><circle cx="208" cy="114" r="11" fill="${SKIN_SHADE}"/>
<circle cx="150" cy="108" r="58" fill="${SKIN}"/>
${face(mood)}${hairFront(avatar, c)}`;
  const tilt = HEAD_TILT[mood];
  const figure = `${body}<g${tilt ? ` transform="${tilt}"` : ''}>${head}</g>${rightArmOverHead ? arm(SHOULDER_R, ra, c.top) : ''}${extras(mood)}`;
  // Running characters lean forward and face left (away from the guard dog).
  return mood === 'running' ? `<g transform="rotate(-8 150 200)">${figure}</g>` : figure;
}

export function characterSvg(avatar: Avatar, mood: CharacterMood): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${characterMarkup(avatar, mood)}</svg>`;
}
