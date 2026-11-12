import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { one, q } from '@/lib/db';
import AdminShell from '@/components/AdminShell';
import { updateLead, addLead } from '../actions';

const STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['visit_scheduled', 'Visit fixed'], ['converted', 'Moved in'], ['lost', 'Lost'], ['spam', 'Spam']] as const;
const KINDS: Record<string, string> = { callback: 'Call-back request', phone_reveal: 'Viewed number', call: 'Phone call', whatsapp: 'WhatsApp', visit_request: 'Visit request' };
type SP = { status?: string; kind?: string; pid?: string; due?: string; q?: string; added?: string };

export default async function Leads({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const f = await searchParams;
  const w: string[] = ['true']; const v: unknown[] = [];
  const add = (sql: string, val: unknown) => { v.push(val); w.push(sql.replaceAll('$?', `$${v.length}`)); };
  if (f.status) add('l.status = $?', f.status);
  if (f.kind) add('l.kind = $?', f.kind);
  else w.push(`l.kind <> 'phone_reveal'`);
  if (f.pid && /^[0-9a-f-]{36}$/.test(f.pid)) add('l.property_id = $?::uuid', f.pid);
  if (f.due) w.push(`l.follow_up <= current_date and l.status not in ('converted','lost','spam')`);
  if (f.q?.trim()) add(`(l.name ilike '%' || $? || '%' or l.phone like '%' || $? || '%' or p.name ilike '%' || $? || '%')`, f.q.trim());
  const where = w.join(' and ');
  const rows = await q<{ id: number; kind: string; name: string | null; phone: string | null; message: string | null; preferred_time: string | null; status: string; notes: string | null; follow_up: string | null; created_at: string; pid: string | null; property: string | null; owner_phone: string | null }>(
    `select l.id, l.kind, l.name, l.phone, l.message, l.preferred_time, l.status, l.notes, to_char(l.follow_up, 'YYYY-MM-DD') follow_up, l.created_at, p.id pid, p.name property, p.phone owner_phone
     from leads l left join properties p on p.id = l.property_id where ${where} order by (l.status = 'new') desc, l.created_at desc limit 100`, v);
  const counts = await q<{ status: string; n: number }>(`select status, count(*)::int n from leads where kind <> 'phone_reveal' group by 1`);
  const reveals = await one<{ n: number; d: number }>(`select count(*)::int n, count(*) filter (where created_at > now() - interval '1 day')::int d from leads where kind = 'phone_reveal'`);
  const c = Object.fromEntries(counts.map((x) => [x.status, x.n]));
  const link = (o: Partial<SP>) => { const p = new URLSearchParams(); Object.entries({ ...f, added: undefined, ...o }).forEach(([k, x]) => x && p.set(k, String(x))); return `/admin/leads?${p}`; };
  const here = link({});
  return (
    <AdminShell active="/admin/leads">
      {f.added && <p className="notice mb-4">Lead added.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Leads</h1>
        <p className="text-sm text-muted">Phone numbers viewed: <span className="num text-ink">{reveals?.n ?? 0}</span> in total, <span className="num text-ink">{reveals?.d ?? 0}</span> today. <Link href={link({ kind: 'phone_reveal', status: undefined })} className="underline">See them</Link></p>
      </div>
      <div className="scroll-x -mx-4 mt-4 flex gap-2 px-4">
        <Link href={link({ status: undefined })} className="chip" aria-current={!f.status ? 'true' : undefined}>All</Link>
        {STAGES.map(([k, l]) => <Link key={k} href={link({ status: k })} className="chip" aria-current={f.status === k ? 'true' : undefined}>{l}<span className="num ml-2 text-muted">{c[k] ?? 0}</span></Link>)}
        <Link href={link({ due: f.due ? undefined : '1' })} className="chip" aria-current={f.due ? 'true' : undefined}>Follow-up due</Link>
      </div>
      <form className="mt-3 flex gap-2">
        {Object.entries(f).filter(([k, x]) => x && k !== 'q' && k !== 'added').map(([k, x]) => <input key={k} type="hidden" name={k} value={String(x)} />)}
        <input name="q" defaultValue={f.q ?? ''} className="field" placeholder="Name, phone or listing" aria-label="Search leads" />
        <button className="btn">Search</button>
      </form>

      <div className="mt-4 grid gap-3">
        {rows.length ? rows.map((l) => (
          <form key={l.id} action={updateLead} className="card grid gap-3 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-start">
            <input type="hidden" name="id" value={l.id} /><input type="hidden" name="back" value={here} />
            <div className="min-w-0">
              <p className="font-medium">{l.name ?? 'Visitor'} {l.phone && <a href={`tel:+91${l.phone}`} className="num text-accent-deep underline">{l.phone}</a>}</p>
              <p className="text-sm text-muted">{KINDS[l.kind] ?? l.kind}, {new Date(l.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{l.preferred_time ? `. Call: ${l.preferred_time}` : ''}</p>
              {l.message && <p className="mt-1 text-sm">{l.message}</p>}
              {l.pid && <p className="mt-1 text-sm"><Link href={`/admin/listings/${l.pid}`} className="underline">{l.property}</Link>{l.owner_phone ? <span className="num text-muted"> owner {l.owner_phone}</span> : null}</p>}
            </div>
            <div className="grid gap-2">
              <label className="label">Stage<select name="status" defaultValue={l.status} className="field">{STAGES.map(([k, lab]) => <option key={k} value={k}>{lab}</option>)}</select></label>
              <label className="label">Follow up on<input type="date" name="follow_up" defaultValue={l.follow_up ?? ''} className="field" /></label>
            </div>
            <label className="label">Notes<textarea name="notes" rows={3} defaultValue={l.notes ?? ''} className="field" placeholder="Called, wants 3 sharing from 1 Dec" /></label>
            <button className="btn self-end">Save</button>
          </form>
        )) : <p className="card p-6 text-sm text-muted">No leads here yet. Call-back requests from listing pages arrive in this list.</p>}
      </div>

      <details className="card mt-8 max-w-2xl p-4">
        <summary className="cursor-pointer font-medium">Add a lead by hand</summary>
        <form action={addLead} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="label">Name<input name="name" className="field" /></label>
          <label className="label">Mobile<input name="phone" required inputMode="numeric" className="field" /></label>
          <label className="label sm:col-span-2">Listing ID (optional)<input name="pid" defaultValue={f.pid ?? ''} className="field" /></label>
          <label className="label sm:col-span-2">What they need<input name="message" className="field" /></label>
          <label className="label sm:col-span-2">Notes<textarea name="notes" rows={2} className="field" /></label>
          <button className="btn btn-primary w-fit">Add lead</button>
        </form>
      </details>
    </AdminShell>
  );
}
