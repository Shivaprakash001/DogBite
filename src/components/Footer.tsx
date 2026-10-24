import Link from 'next/link';
import { getCopy } from '@/content/copy';

export function Footer() {
  const copy = getCopy();
  return (
    <footer className="mt-12 flex flex-col items-center gap-2 text-center text-sm text-ink-soft">
      <nav className="flex flex-wrap items-center justify-center gap-x-4" aria-label="Footer">
        <Link href="/leaderboard" className="min-h-11 py-3 font-semibold underline-offset-4 hover:underline">
          {copy.footer.faceoff}
        </Link>
        <Link href="/privacy" className="min-h-11 py-3 font-semibold underline-offset-4 hover:underline">
          {copy.common.privacy}
        </Link>
      </nav>
      <p>{copy.footer.madeBy}</p>
    </footer>
  );
}
