import Image from 'next/image';
import Link from 'next/link';
import { ASSETS } from '@/content/assets';
import { getCopy } from '@/content/copy';
import { LanguageSwitcher } from './ui/LanguageSwitcher';
import { SoundToggle } from './SoundToggle';

export function AppHeader() {
  const copy = getCopy();
  return (
    <header className="flex items-center justify-between gap-2 py-3">
      <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl" aria-label={`${copy.brand.product} home`}>
        <Image src={ASSETS['logo.mark']} alt="" width={30} height={40} priority className="h-9 w-auto" />
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-extrabold text-charcoal">{copy.brand.product}</span>
          <span className="font-display text-[0.7rem] font-bold text-terracotta">{copy.brand.by}</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <SoundToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
