import type { Gender } from '@/content/types';

const PRONOUNS: Record<Gender, { their: string; them: string }> = {
  he: { their: 'his', them: 'him' },
  she: { their: 'her', them: 'her' },
  they: { their: 'their', them: 'them' },
};

/** Fill a question template with the creator's name and pronouns. */
export function renderQuestionText(template: string, name: string, gender: Gender | null): string {
  const p = PRONOUNS[gender ?? 'they'];
  return template
    .replaceAll('{name}', name)
    .replaceAll('{their}', p.their)
    .replaceAll('{them}', p.them);
}
