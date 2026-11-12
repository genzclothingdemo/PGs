import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { q } from '@/lib/db';
import { photoUrl } from '@/lib/format';
import AdminShell from '@/components/AdminShell';
import { photoDecision, claimDecision, reportDecision } from '../actions';

const REASON: Record<string, string> = { wrong_number: 'Wrong number', full: 'No beds available', closed: 'Closed', fake: 'Fake listing', wrong_info: 'Wrong details', other: 'Other' };

export default async function Moderation() {
  await requireAdmin();
  const [photos, claims, reports] = await Promise.all([
    q<{ id: string; path: string; pid: string; name: string }>(`select ph.id, ph.path, p.id pid, p.name from photos ph join properties p on p.id = ph.property_id where not ph.approved order by ph.created_at limit 40`),
    q<{ id: string; note: string | null; pid: string; name: string; who: string | null; email: string | null; phone: string | null; listing_phone: string | null }>(
      `select c.id, c.note, p.id pid, p.name, pr.full_name who, pr.email, pr.phone, p.phone listing_phone from claims c join properties p on p.id = c.property_id join profiles pr on pr.id = c.user_id where c.status = 'pending' order by c.created_at`),
    q<{ id: string; reason: string; detail: string | null; created_at: string; pid: string; name: string; n: number }>(
      `select r.id, r.reason, r.detail, r.created_at, p.id pid, p.name, (select count(*)::int from reports r2 where r2.property_id = p.id and r2.status = 'open') n from reports r join properties p on p.id = r.property_id where r.status = 'open' order by r.created_at`),
  ]);
  return (
    <AdminShell active="/admin/moderation">
      <h1 className="text-2xl">Moderation</h1>

      <section className="mt-6">
        <h2 className="text-lg">Photos to check <span className="num text-base font-normal text-muted">{photos.length}</span></h2>
        {photos.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{photos.map((ph) => (
          <form key={ph.id} action={photoDecision} className="grid gap-1 text-sm">
            <input type="hidden" name="id" value={ph.id} /><input type="hidden" name="back" value="/admin/moderation" />
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={photoUrl(ph.path)} alt="" className="aspect-square w-full rounded-[10px] object-cover" />
            <Link href={`/admin/listings/${ph.pid}`} className="truncate underline">{ph.name}</Link>
            <div className="flex gap-1"><button name="ok" value="1" className="btn flex-1 !min-h-9 text-sm">Approve</button><button name="ok" value="0" className="btn btn-quiet flex-1 text-sm">Delete</button></div>
          </form>))}</div> : <p className="mt-2 text-sm text-muted">No photos waiting.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Ownership claims <span className="num text-base font-normal text-muted">{claims.length}</span></h2>
        <p className="text-sm text-muted">Call the number on the listing and confirm before you approve.</p>
        <div className="mt-3 grid gap-3">{claims.length ? claims.map((c) => (
          <form key={c.id} action={claimDecision} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <input type="hidden" name="id" value={c.id} />
            <div><Link href={`/admin/listings/${c.pid}`} className="font-medium underline">{c.name}</Link><p className="text-muted">{c.who} ({c.email}), <span className="num">{c.phone}</span>. Listing phone <span className="num">{c.listing_phone ?? 'none'}</span>{c.note ? `. ${c.note}` : ''}</p></div>
            <div className="flex gap-2"><button name="ok" value="1" className="btn btn-primary">Approve</button><button name="ok" value="0" className="btn">Reject</button></div>
          </form>)) : <p className="text-sm text-muted">No claims waiting.</p>}</div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Reports from visitors <span className="num text-base font-normal text-muted">{reports.length}</span></h2>
        <div className="mt-3 grid gap-3">{reports.length ? reports.map((r) => (
          <form key={r.id} action={reportDecision} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <input type="hidden" name="id" value={r.id} />
            <div><Link href={`/admin/listings/${r.pid}`} className="font-medium underline">{r.name}</Link><p className="text-muted">{REASON[r.reason] ?? r.reason}{r.detail ? `: ${r.detail}` : ''}. {r.n > 1 ? `${r.n} open reports on this listing.` : ''}</p></div>
            <div className="flex gap-2"><button name="status" value="resolved" className="btn">Fixed</button><button name="status" value="dismissed" className="btn btn-quiet">Dismiss</button></div>
          </form>)) : <p className="text-sm text-muted">No open reports.</p>}</div>
      </section>
    </AdminShell>
  );
}
