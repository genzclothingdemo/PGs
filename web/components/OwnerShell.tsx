import Link from 'next/link';
import { logOut } from '@/app/owner/auth-actions';

export default function OwnerShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="wrap flex h-14 items-center justify-between gap-3">
          <Link href="/owner" className="font-display text-xl font-bold">PGhub <span className="font-sans text-sm font-normal text-muted">for owners</span></Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">{email}</span>
            <form action={logOut}><button className="btn btn-quiet">Log out</button></form>
          </div>
        </div>
      </header>
      <main className="wrap py-5 md:py-8">{children}</main>
    </div>
  );
}
