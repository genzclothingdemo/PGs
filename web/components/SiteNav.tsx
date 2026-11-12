'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', d: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { href: '/explore', label: 'Explore', d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2' },
  { href: '/saved', label: 'Saved', d: 'M6 3h12v18l-6-4-6 4z' },
  { href: '/list-your-property', label: 'List property', d: 'M12 5v14M5 12h14' },
];
const active = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

export function TopBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
      <div className="wrap flex h-14 items-center justify-between gap-4">
        <Link href="/" className="font-display text-xl font-bold text-ink">PGhub</Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {TABS.slice(0, 3).map((t) => (
            <Link key={t.href} href={t.href} aria-current={active(path, t.href) ? 'page' : undefined}
              className={`rounded-[10px] px-3 py-2 text-[.95rem] ${active(path, t.href) ? 'bg-paper-3 font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}>{t.label}</Link>
          ))}
          <Link href="/list-your-property" className="btn btn-primary ml-2">List your property</Link>
        </nav>
        <Link href="/owner" className="text-sm text-ink-2 md:hidden">Owner login</Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          const on = active(path, t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? 'page' : undefined} className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${on ? 'font-medium text-accent-deep' : 'text-muted'}`}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
