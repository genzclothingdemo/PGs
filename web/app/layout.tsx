import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { session, supabase } from '@/lib/supabase/server';
import './globals.css';
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
export const metadata: Metadata = { title: 'PGhub - PG & rented homes in Gandhinagar and Ahmedabad', description: 'Find boys and girls PGs, hostels and rented flats. Compare price, sharing, food and distance.' };

async function signOut() { 'use server'; const sb = await supabase(); await sb.auth.signOut(); redirect('/'); }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, staff } = await session();
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="font-display text-xl font-semibold text-forest">PGhub</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/search?type=pg" className="hover:text-forest hidden sm:block">PGs &amp; hostels</Link>
              <Link href="/search?type=home" className="hover:text-forest hidden sm:block">Rented homes</Link>
              {user ? (<>
                <Link href="/shortlist" className="hover:text-forest">Saved</Link>
                <Link href="/dashboard" className="hover:text-forest">My listings</Link>
                {staff && <Link href="/admin" className="hover:text-forest font-semibold">Admin</Link>}
                <form action={signOut}><button className="text-muted hover:text-ink">Sign out</button></form>
              </>) : (<>
                <Link href="/login" className="hover:text-forest">Sign in</Link>
                <Link href="/dashboard/new" className="btn btn-ghost !py-1.5">List your property</Link>
              </>)}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16 py-8 text-sm text-muted">
          <div className="mx-auto max-w-6xl px-4 flex flex-wrap gap-4 justify-between">
            <span>&copy; PGhub - Gandhinagar &amp; Ahmedabad</span>
            <span>Listings marked &ldquo;Unverified&rdquo; come from public sources and are not yet confirmed by the owner.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
