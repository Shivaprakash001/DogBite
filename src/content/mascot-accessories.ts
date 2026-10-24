import type { MascotMood } from './assets';
import type { Gender } from './types';

// Gender accessories for the Stayo pup, as static SVG markup in the mascot's
// 300×300 space. One source for both the <Mascot> component and OG images.
// Replace with dedicated per-gender art via the asset manifest when it exists.

/** Head-group transform per mood, mirrored from the mood SVGs so accessories sit right. */
const HEAD_TRANSFORM: Partial<Record<MascotMood, string>> = {
  confused: 'rotate(-8 150 130)',
  thinking: 'rotate(-8 150 130)',
  sleepy: 'rotate(4 150 130)',
  pulling: 'translate(0 -6)',
};

const BOW = `<g transform="translate(104 78) rotate(-20)">
  <path d="M0 0 C-10 -16 -32 -16 -30 0 C-32 16 -10 16 0 0 Z" fill="#E8837E"/>
  <path d="M0 0 C10 -16 32 -16 30 0 C32 16 10 16 0 0 Z" fill="#E8837E"/>
  <path d="M-22 -2 C-16 -6 -10 -4 -6 0" stroke="#C9605B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M22 -2 C16 -6 10 -4 6 0" stroke="#C9605B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle r="7" fill="#C9605B"/>
</g>`;

const CAP = `<g transform="rotate(-6 150 70)">
  <path d="M106 80 Q108 44 150 42 Q192 44 194 80 Z" fill="#2F2F2F"/>
  <path d="M150 42 L150 80" stroke="#4a4a4a" stroke-width="2"/>
  <path d="M98 80 Q150 92 202 80 Q206 86 200 90 Q150 102 100 90 Q94 86 98 80 Z" fill="#F2B33D"/>
  <circle cx="150" cy="42" r="5" fill="#F2B33D"/>
</g>`;

const BANDANA = `<path d="M108 184 Q150 198 192 184 L184 196 Q160 230 150 236 Q140 230 116 196 Z" fill="#F2B33D"/>
<circle cx="132" cy="198" r="3.5" fill="#F7F3EE"/>
<circle cx="150" cy="212" r="3.5" fill="#F7F3EE"/>
<circle cx="168" cy="198" r="3.5" fill="#F7F3EE"/>
<circle cx="150" cy="194" r="3" fill="#F7F3EE"/>
<path d="M108 184 Q150 198 192 184" stroke="#C98A17" stroke-width="3" fill="none" stroke-linecap="round"/>`;

/** Accessory markup (no <svg> wrapper) for a gender + mood. Static strings only. */
export function accessoryMarkup(gender: Gender, mood: MascotMood): string {
  if (gender === 'they') return BANDANA; // sits on the neck, unaffected by head tilt
  const head = HEAD_TRANSFORM[mood];
  const art = gender === 'she' ? BOW : CAP;
  return head ? `<g transform="${head}">${art}</g>` : art;
}

/** Inject the accessory into a full mascot SVG document (for image generation). */
export function withAccessory(svg: string, gender: Gender | null, mood: MascotMood): string {
  if (!gender) return svg;
  const i = svg.lastIndexOf('</svg>');
  return i === -1 ? svg : `${svg.slice(0, i)}${accessoryMarkup(gender, mood)}${svg.slice(i)}`;
}
