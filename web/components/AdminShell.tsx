import Link from 'next/link';
import { adminLogout } from '@/app/admin/actions';

const NAV = [['/admin', 'Overview'], ['/admin/listings', 'Listings'], ['/admin/leads', 'Leads'], ['/admin/owners', 'Owners'], ['/admin/moderation', 'Moderation']] as const;

export default function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper-2">
      <header className="sticky top-0 z-30 border-b border-rule bg-surface">
        <div className="wrap flex h-14 items-center justify-between gap-3">
          <Link href="/admin" className="font-display text-xl font-bold">PGhub <span className="font-sans text-sm font-normal text-muted">admin</span></Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/" className="btn btn-quiet" target="_blank">View site</Link>
            <form action={adminLogout}><button className="btn btn-quiet">Log out</button></form>
          </div>
        </div>
        <nav aria-label="Admin" className="wrap scroll-x flex gap-1 pb-2">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}
              className={`rounded-[10px] px-3 py-2 text-sm whitespace-nowrap ${active === href ? 'bg-accent-soft font-medium text-ink' : 'text-ink-2 hover:bg-paper-3'}`}>{label}</Link>
          ))}
        </nav>
      </header>
      <main className="wrap py-5 md:py-7">{children}</main>
    </div>
  );
}
