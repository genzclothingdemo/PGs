import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/supabase/server';
import { one, q } from '@/lib/db';
import { photoUrl } from '@/lib/format';
import OwnerShell from '@/components/OwnerShell';
import ListingFields, { type ListingValues } from '@/components/ListingFields';
import UnitsEditor from '@/components/UnitsEditor';
import { StatusTag } from '@/components/StatusTag';
import { updateListing, addUnit, removeUnit, uploadPhoto, submitForReview } from '../actions';

type SP = { saved?: string; submitted?: string; error?: string; photos?: string; photoerr?: string; step?: string };

export default async function EditListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params; const sp = await searchParams;
  const { user } = await requireOwner(`/owner/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await one<ListingValues & { id: string; status: string; rejection_reason: string | null }>(
    `select p.id, p.type, p.gender, c.slug city_slug, p.owner_kind, p.name, p.address, p.area_label, p.lat, p.lng, p.phone, p.whatsapp, p.food_option, p.gate_time, p.amenities, p.rules, p.description, p.status, p.rejection_reason
     from properties p join cities c on c.id = p.city_id where p.id = $1 and p.owner_id = $2`, [id, user.id]);
  if (!p) notFound();
  const [units, photos] = await Promise.all([
    q<{ id: string; label: string | null; rent: number; deposit: number | null; ac: boolean | null; food_included: boolean | null; beds_available: number | null }>(`select id, label, rent, deposit, ac, food_included, beds_available from units where property_id = $1 order by rent`, [id]),
    q<{ id: string; path: string; approved: boolean }>(`select id, path, approved from photos where property_id = $1 order by created_at`, [id]),
  ]);
  const canSubmit = ['draft', 'changes_requested', 'rejected'].includes(p.status);
  return (
    <OwnerShell email={user.email ?? ''}>
      <Link href="/owner" className="btn btn-quiet -ml-2 text-sm">My listings</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl md:text-3xl">{p.name}</h1><StatusTag status={p.status} /></div>
      {p.status === 'published' && <p className="mt-1 text-sm"><Link href={`/p/${p.id}`} className="text-accent-deep underline">See the live page</Link>. Editing details sends it back for a quick review.</p>}
      {p.rejection_reason && <p className="notice notice-warn mt-3">Note from PGhub: {p.rejection_reason}</p>}
      {sp.saved && <p className="notice mt-3">Saved.</p>}
      {sp.submitted && <p className="notice mt-3">Sent for review. We usually check new listings within a day.</p>}
      {sp.error && <p className="notice notice-warn mt-3">{sp.error}</p>}

      <section className="mt-8 max-w-3xl">
        <h2 className="text-xl">Rooms and rent</h2>
        <p className="mb-3 text-sm text-muted">Add one row for each sharing type. Tenants filter by rent, so a price brings more calls.</p>
        <UnitsEditor units={units} pid={id} type={p.type ?? 'pg'} add={addUnit} remove={removeUnit} />
      </section>

      <section id="photos" className="mt-10 max-w-3xl">
        <h2 className="text-xl">Photos</h2>
        <p className="mb-3 text-sm text-muted">Rooms, bathroom, kitchen and the building from outside. Photos show after our team checks them.</p>
        {sp.photos && <p className="notice mb-3">Photos uploaded.</p>}
        {sp.photoerr && <p className="notice notice-warn mb-3">{sp.photoerr} photo(s) could not be uploaded. Use JPG or PNG under 6 MB.</p>}
        {photos.length > 0 && <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{photos.map((ph) => (
          <figure key={ph.id} className="relative">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photoUrl(ph.path)} alt="" className="aspect-square w-full rounded-[10px] object-cover" />
            <figcaption className={`tag absolute bottom-1 left-1 ${ph.approved ? 'tag-ok' : 'tag-wait'}`}>{ph.approved ? 'Approved' : 'Checking'}</figcaption></figure>))}</div>}
        <form action={uploadPhoto} className="card flex flex-wrap items-center gap-3 p-3">
          <input type="hidden" name="pid" value={id} />
          <input type="file" name="files" accept="image/*" multiple required className="text-sm" />
          <button className="btn">Upload photos</button>
        </form>
      </section>

      {canSubmit && (
        <form action={submitForReview} className="mt-10 max-w-3xl border-t border-rule pt-6">
          <input type="hidden" name="pid" value={id} />
          <button className="btn btn-primary">Send for review</button>
          <p className="mt-2 text-sm text-muted">Needs at least one room with its rent.</p>
        </form>
      )}

      <details className="mt-10 max-w-3xl" open={sp.step === 'details'}>
        <summary className="cursor-pointer text-xl font-bold">Edit details</summary>
        <form action={updateListing} className="mt-4 grid gap-5">
          <input type="hidden" name="pid" value={id} />
          <ListingFields v={p} />
          <button className="btn btn-primary w-fit">Save details</button>
        </form>
      </details>
    </OwnerShell>
  );
}
