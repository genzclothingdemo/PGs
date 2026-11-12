import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { photoUrl } from '@/lib/format';
import AdminShell from '@/components/AdminShell';
import ListingFields, { type ListingValues } from '@/components/ListingFields';
import UnitsEditor from '@/components/UnitsEditor';
import { StatusTag } from '@/components/StatusTag';
import { saveListing, setStatus, adminAddUnit, adminRemoveUnit, photoDecision, deleteListing } from '../../actions';

type Row = ListingValues & { id: string; status: string; source: string; verified: string; rejection_reason: string | null; admin_notes: string | null; google_rating: number | null; google_reviews: number | null;
  owner_name: string | null; owner_email: string | null; owner_phone: string | null; created_at: string; listing_url: string | null };

export default async function AdminListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; created?: string }> }) {
  await requireAdmin();
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await one<Row>(`select p.*, c.slug city_slug, pr.full_name owner_name, pr.email owner_email, pr.phone owner_phone, p.google_rating::float
    from properties p join cities c on c.id = p.city_id left join profiles pr on pr.id = p.owner_id where p.id = $1`, [id]);
  if (!p) notFound();
  const [units, photos, leads] = await Promise.all([
    q<{ id: string; label: string | null; rent: number; deposit: number | null; ac: boolean | null; food_included: boolean | null; beds_available: number | null }>(`select id, label, rent, deposit, ac, food_included, beds_available from units where property_id = $1 order by rent`, [id]),
    q<{ id: string; path: string; approved: boolean }>(`select id, path, approved from photos where property_id = $1 order by created_at`, [id]),
    q<{ id: number; kind: string; name: string | null; phone: string | null; status: string; created_at: string }>(`select id, kind, name, phone, status, created_at from leads where property_id = $1 order by created_at desc limit 20`, [id]),
  ]);
  const back = `/admin/listings/${id}`;
  return (
    <AdminShell active="/admin/listings">
      <Link href="/admin/listings" className="btn btn-quiet -ml-2 text-sm">All listings</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl">{p.name}</h1><StatusTag status={p.status} /></div>
      <p className="text-sm text-muted">Source: {p.source}. Added {new Date(p.created_at).toLocaleDateString('en-IN')}.{p.google_rating ? ` Google ${p.google_rating} from ${p.google_reviews} reviews.` : ''} {p.status === 'published' && <Link href={`/p/${id}`} target="_blank" className="underline">Open live page</Link>}</p>
      {(sp.saved || sp.created) && <p className="notice mt-3">{sp.created ? 'Listing created. Add rooms and rent below.' : 'Saved.'}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-8">
          <section>
            <h2 className="mb-3 text-lg">Rooms and rent</h2>
            <UnitsEditor units={units} pid={id} type={p.type ?? 'pg'} add={adminAddUnit} remove={adminRemoveUnit} />
          </section>
          <section>
            <h2 className="mb-3 text-lg">Photos</h2>
            {photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((ph) => (
              <form key={ph.id} action={photoDecision} className="grid gap-1 text-sm">
                <input type="hidden" name="id" value={ph.id} /><input type="hidden" name="back" value={back} />
                {/* eslint-disable-next-line @next/next/no-img-element */}<img src={photoUrl(ph.path)} alt="" className="aspect-square w-full rounded-[10px] object-cover" />
                <div className="flex gap-1">{!ph.approved && <button name="ok" value="1" className="btn flex-1 !min-h-9 text-sm">Approve</button>}<button name="ok" value="0" className="btn btn-quiet flex-1 text-sm">Delete</button></div>
              </form>))}</div> : <p className="text-sm text-muted">No photos. Owners upload them from their dashboard.</p>}
          </section>
          <details>
            <summary className="cursor-pointer text-lg font-bold">Edit details</summary>
            <form action={saveListing} className="mt-4 grid gap-5">
              <input type="hidden" name="id" value={id} />
              <ListingFields v={p} admin />
              <label className="label">Verification<select name="verified" className="field" defaultValue={p.verified}><option value="admin_verified">Verified by PGhub</option><option value="owner_claimed">Owner claimed</option><option value="phone_verified">Phone confirmed</option><option value="unverified">Not verified</option></select></label>
              <label className="label">Private notes for the team<textarea name="admin_notes" rows={3} className="field" defaultValue={p.admin_notes ?? ''} /></label>
              <button className="btn btn-primary w-fit">Save details</button>
            </form>
          </details>
        </div>

        <aside className="grid h-fit gap-4">
          <form action={setStatus} className="card grid gap-3 p-4">
            <input type="hidden" name="id" value={id} /><input type="hidden" name="back" value={back} />
            <h2 className="text-lg">Decision</h2>
            <label className="label">Note to the owner (for changes or rejection)<textarea name="note" rows={2} className="field" defaultValue={p.rejection_reason ?? ''} /></label>
            <div className="grid grid-cols-2 gap-2">
              <button name="status" value="published" className="btn btn-primary">Approve</button>
              <button name="status" value="changes_requested" className="btn">Ask changes</button>
              <button name="status" value="paused" className="btn">Pause</button>
              <button name="status" value="rejected" className="btn">Reject</button>
            </div>
          </form>
          <div className="card p-4 text-sm">
            <h2 className="text-lg">Owner</h2>
            {p.owner_email ? <p className="mt-1">{p.owner_name}<span className="block text-muted">{p.owner_email}</span><span className="num block">{p.owner_phone}</span></p> : <p className="mt-1 text-muted">No owner account. Listing phone: <span className="num text-ink">{p.phone ?? 'none'}</span></p>}
            {p.listing_url && <a href={p.listing_url} target="_blank" rel="noopener" className="mt-2 block underline">Original listing</a>}
          </div>
          <div className="card p-4 text-sm">
            <div className="flex items-center justify-between"><h2 className="text-lg">Leads</h2><Link href={`/admin/leads?pid=${id}`} className="btn btn-quiet text-sm">Open in CRM</Link></div>
            {leads.length ? <ul className="mt-2 grid gap-2">{leads.map((l) => <li key={l.id} className="flex justify-between gap-2"><span>{l.name ?? l.kind.replace('_', ' ')}{l.phone ? <span className="num block text-muted">{l.phone}</span> : null}</span><span className="text-muted">{l.status.replace('_', ' ')}</span></li>)}</ul> : <p className="mt-1 text-muted">No leads yet.</p>}
          </div>
          <details className="card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Archive this listing</summary>
            <form action={deleteListing} className="mt-3 grid gap-2">
              <input type="hidden" name="id" value={id} />
              <label className="label">Type DELETE to confirm<input name="confirm" className="field" autoComplete="off" /></label>
              <button className="btn">Archive</button>
              <p className="text-xs text-muted">Archived listings leave the site. Set the status back to restore one.</p>
            </form>
          </details>
        </aside>
      </div>
    </AdminShell>
  );
}
