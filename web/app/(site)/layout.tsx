import Link from 'next/link';
import { TopBar, BottomNav } from '@/components/SiteNav';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="pb-24 md:pb-0">{children}</main>
      <footer className="mt-16 hidden border-t border-rule py-8 text-sm text-muted md:block">
        <div className="wrap flex flex-wrap justify-between gap-6">
          <p>PGhub lists PGs, hostels and rented homes in Gandhinagar and Ahmedabad.</p>
          <p className="max-w-md">Listings marked unverified come from public sources and are not yet confirmed by the owner. Visit before you pay.</p>
          <nav className="flex gap-4"><Link href="/owner" className="hover:text-ink">Owner login</Link><Link href="/list-your-property" className="hover:text-ink">List your property</Link></nav>
        </div>
      </footer>
      <BottomNav />
    </>
  );
}
