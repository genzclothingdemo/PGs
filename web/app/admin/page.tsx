import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { one, q } from '@/lib/db';
import AdminShell from '@/components/AdminShell';
import { recompute } from './actions';

export const metadata = { title: 'Admin', robots: { index: false } };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ recomputed?: string }> }) {
  await requireAdmin();
  const { recomputed } = await searchParams;
  const s = await one<Record<string, number>>(`select
    (select count(*)::int from properties where status='published') live,
    (select count(*)::int from properties where status in ('submitted','in_review')) waiting,
    (select count(*)::int from properties where status='published' and type='pg') pgs,
    (select count(*)::int from properties where status='published' and type='home') homes,
    (select count(*)::int from leads where created_at > now() - interval '7 days') leads7,
    (select count(*)::int from leads where status='new' and kind='callback') newcallbacks,
    (select count(*)::int from leads where follow_up <= current_date and status not in ('converted','lost','spam')) due,
    (select count(*)::int from user_roles where role='owner') owners,
    (select count(*)::int from photos where not approved) photos,
    (select count(*)::int from reports where status='open') reports,
    (select count(*)::int from claims where status='pending') claims`);
  const recent = await q<{ id: number; kind: string; name: string | null; phone: string | null; created_at: string; property: string | null; pid: string | null }>(
    `select l.id, l.kind, l.name, l.phone, l.created_at, p.name property, p.id pid from leads l left join properties p on p.id = l.property_id order by l.created_at desc limit 8`);
  const waiting = await q<{ id: string; name: string; type: string; created_at: string }>(`select id, name, type, created_at from properties where status in ('submitted','in_review') order by updated_at limit 6`);
  const tiles: [string, number, string][] = [
    ['Live listings', s!.live, '/admin/listings?status=published'], ['Waiting for review', s!.waiting, '/admin/listings?status=submitted'],
    ['Leads in 7 days', s!.leads7, '/admin/leads'], ['Follow-ups due', s!.due, '/admin/leads?due=1'],
    ['New call-back requests', s!.newcallbacks, '/admin/leads?kind=callback&status=new'], ['Owners', s!.owners, '/admin/owners'],
    ['Photos to check', s!.photos, '/admin/moderation'], ['Open reports', s!.reports + s!.claims, '/admin/moderation'],
  ];
  return (
    <AdminShell active="/admin">
      {recomputed && <p className="notice mb-4">Ranking recomputed.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Overview</h1>
        <div className="flex gap-2"><Link href="/admin/listings/new" className="btn btn-primary">Add listing</Link><form action={recompute}><button className="btn">Recompute ranking</button></form></div>
      </div>
      <p className="mt-1 text-sm text-muted"><span className="num">{s!.pgs}</span> PGs and <span className="num">{s!.homes}</span> homes are live.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, n, href]) => (
          <Link key={label} href={href} className="card p-4 hover:border-accent"><p className="num text-2xl font-medium">{n}</p><p className="text-sm text-muted">{label}</p></Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-lg">Latest leads</h2><Link href="/admin/leads" className="btn btn-quiet text-sm">All leads</Link></div>
          <div className="card overflow-x-auto"><table className="table"><thead><tr><th>When</th><th>Type</th><th>Who</th><th>Listing</th></tr></thead><tbody>
            {recent.length ? recent.map((l) => (
              <tr key={l.id}><td className="num whitespace-nowrap">{new Date(l.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td><td>{l.kind.replace('_', ' ')}</td><td>{l.name ?? 'Visitor'}{l.phone ? <span className="num block text-muted">{l.phone}</span> : null}</td><td>{l.pid ? <Link href={`/admin/listings/${l.pid}`} className="underline">{l.property}</Link> : 'None'}</td></tr>
            )) : <tr><td colSpan={4} className="text-muted">No leads yet. They appear when visitors view a number or ask for a call back.</td></tr>}
          </tbody></table></div>
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-lg">Waiting for review</h2><Link href="/admin/listings?status=submitted" className="btn btn-quiet text-sm">Review queue</Link></div>
          <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Listing</th><th>Type</th><th>Sent</th></tr></thead><tbody>
            {waiting.length ? waiting.map((w) => (
              <tr key={w.id}><td><Link href={`/admin/listings/${w.id}`} className="underline">{w.name}</Link></td><td>{w.type === 'pg' ? 'PG' : 'Home'}</td><td className="num">{new Date(w.created_at).toLocaleDateString('en-IN')}</td></tr>
            )) : <tr><td colSpan={3} className="text-muted">Nothing waiting. Owner submissions land here.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </AdminShell>
  );
}
