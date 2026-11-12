import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { one, q } from '@/lib/db';
import AdminShell from '@/components/AdminShell';
import { StatusTag, STATUS } from '@/components/StatusTag';
import { bulkStatus } from '../actions';

type SP = { status?: string; type?: string; q?: string; source?: string; page?: string; archived?: string };

export default async function AdminListings({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const f = await searchParams;
  const w: string[] = [`p.status <> 'archived'`]; const v: unknown[] = [];
  const add = (sql: string, val: unknown) => { v.push(val); w.push(sql.replaceAll('$?', `$${v.length}`)); };
  if (f.status && STATUS[f.status]) { w.shift(); add('p.status = $?::listing_status', f.status === 'submitted' ? 'submitted' : f.status); }
  if (f.type === 'pg' || f.type === 'home') add('p.type = $?::property_type', f.type);
  if (f.source && ['owner', 'imported', 'admin'].includes(f.source)) add('p.source = $?::source_kind', f.source);
  if (f.q?.trim()) add(`(p.name ilike '%' || $? || '%' or p.area_label ilike '%' || $? || '%' or p.phone like '%' || $? || '%')`, f.q.trim());
  const page = Math.max(1, Number(f.page) || 1), per = 50, where = w.join(' and ');
  const rows = await q<{ id: string; name: string; type: string; gender: string; area_label: string | null; status: string; source: string; verified: string; phone: string | null; units: number; leads: number; score: number }>(
    `select p.id, p.name, p.type, p.gender, p.area_label, p.status, p.source, p.verified, p.phone, p.score::float,
     (select count(*)::int from units u where u.property_id = p.id) units, (select count(*)::int from leads l where l.property_id = p.id) leads
     from properties p where ${where} order by case when p.status in ('submitted','in_review') then 0 else 1 end, p.updated_at desc limit ${per} offset ${(page - 1) * per}`, v);
  const total = Number((await one<{ n: string }>(`select count(*) n from properties p where ${where}`, v))?.n ?? 0);
  const link = (o: Partial<SP>) => { const p = new URLSearchParams(); Object.entries({ ...f, page: undefined, archived: undefined, ...o }).forEach(([k, x]) => x && p.set(k, String(x))); return `/admin/listings?${p}`; };
  const here = link({ page: String(page) });
  return (
    <AdminShell active="/admin/listings">
      {f.archived && <p className="notice mb-4">Listing archived.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Listings <span className="num text-base font-normal text-muted">{total}</span></h1>
        <Link href="/admin/listings/new" className="btn btn-primary">Add listing</Link>
      </div>
      <form className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <input name="q" defaultValue={f.q ?? ''} className="field col-span-2 md:col-span-1" placeholder="Name, area or phone" aria-label="Search listings" />
        <select name="status" defaultValue={f.status ?? ''} className="field" aria-label="Status"><option value="">All except archived</option>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select name="type" defaultValue={f.type ?? ''} className="field" aria-label="Type"><option value="">PG and homes</option><option value="pg">PG</option><option value="home">Homes</option></select>
        <select name="source" defaultValue={f.source ?? ''} className="field" aria-label="Source"><option value="">Any source</option><option value="owner">Owner</option><option value="imported">Imported</option><option value="admin">Admin</option></select>
        <button className="btn">Filter</button>
      </form>

      <form action={bulkStatus} className="mt-4">
        <input type="hidden" name="back" value={here} />
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th><span className="sr-only">Select</span></th><th>Listing</th><th>Status</th><th>Source</th><th>Rooms</th><th>Leads</th><th>Phone</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" name="ids" value={r.id} aria-label={`Select ${r.name}`} className="h-4 w-4 accent-[var(--color-accent)]" /></td>
                  <td className="min-w-56"><Link href={`/admin/listings/${r.id}`} className="font-medium underline">{r.name}</Link><span className="block text-xs text-muted">{r.type === 'pg' ? `PG, ${r.gender.replace('_', ' ')}` : 'Home'}{r.area_label ? `, ${r.area_label}` : ''}</span></td>
                  <td><StatusTag status={r.status} /></td>
                  <td>{r.source}{r.verified !== 'unverified' ? <span className="block text-xs text-muted">{r.verified.replace('_', ' ')}</span> : null}</td>
                  <td className="num">{r.units}</td>
                  <td className="num">{r.leads}</td>
                  <td className="num whitespace-nowrap">{r.phone ?? 'None'}</td>
                </tr>
              )) : <tr><td colSpan={7} className="text-muted">No listings match.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">With selected:</span>
          <button name="status" value="published" className="btn">Publish</button>
          <button name="status" value="paused" className="btn">Pause</button>
          <button name="status" value="archived" className="btn">Archive</button>
        </div>
      </form>
      <nav className="mt-6 flex items-center justify-between">
        {page > 1 ? <Link href={link({ page: String(page - 1) })} className="btn">Previous</Link> : <span />}
        <span className="text-sm text-muted">Page <span className="num">{page}</span> of <span className="num">{Math.max(1, Math.ceil(total / per))}</span></span>
        {page * per < total ? <Link href={link({ page: String(page + 1) })} className="btn">Next</Link> : <span />}
      </nav>
    </AdminShell>
  );
}
