import Link from 'next/link';
import { notFound } from 'next/navigation';
import { session } from '@/lib/supabase/server';
import { addUnit, removeUnit, uploadPhoto, submitForReview } from '../actions';

export default async function Manage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const { id } = await params; const { error, done } = await searchParams;
  const { sb, user } = await session();
  const { data: p } = await sb.from('properties').select('id,name,type,status,rejection_reason,owner_id,address,area_label').eq('id', id).eq('owner_id', user!.id).maybeSingle();
  if (!p) notFound();
  const [{ data: units }, { data: photos }] = await Promise.all([sb.from('units').select('*').eq('property_id', id).order('rent'), sb.from('photos').select('id,path,approved').eq('property_id', id)]);
  const editable = ['draft', 'changes_requested'].includes(p.status);
  const img = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${path}`;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-muted">&larr; My listings</Link>
      <h1 className="text-2xl font-semibold mt-1">{p.name}</h1>
      <p className="text-sm text-muted">Status: <b>{p.status.replace('_', ' ')}</b>{p.rejection_reason ? ` - ${p.rejection_reason}` : ''}{p.status === 'published' && <> &middot; <Link className="text-forest" href={`/p/${p.id}`}>view live page</Link></>}</p>
      {error && <p className="mt-3 text-sm bg-[#f6e3dc] text-clay rounded p-3">{error}</p>}
      {done && <p className="mt-3 text-sm bg-[#dfe9e3] text-forest rounded p-3">Submitted. Our team will review it, usually within a day.</p>}

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Rooms &amp; prices</h2>
        {(units ?? []).length > 0 && <table className="w-full text-sm bg-card border border-line rounded-lg mb-3"><tbody>{(units ?? []).map((u) => (
          <tr key={u.id} className="border-b border-line last:border-0"><td className="p-3">{u.label}{u.ac ? ' · AC' : ''}{u.food_included ? ' · food' : ''}</td><td className="p-3 font-semibold">&#8377;{u.rent}</td><td className="p-3 text-muted">deposit {u.deposit ?? '-'}</td><td className="p-3 text-right">{editable && <form action={removeUnit}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="pid" value={id} /><button className="text-clay">Remove</button></form>}</td></tr>))}</tbody></table>}
        {editable && <form action={addUnit} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm bg-card border border-line rounded-lg p-3">
          <input type="hidden" name="pid" value={id} />
          <label className="col-span-2">Label<input name="label" className="field mt-1" placeholder={p.type === 'pg' ? '3 sharing' : '2 BHK flat'} /></label>
          <label>Rent / month<input name="rent" required inputMode="numeric" className="field mt-1" /></label>
          <label>Deposit<input name="deposit" inputMode="numeric" className="field mt-1" /></label>
          {p.type === 'pg' ? <><label>Sharing<input name="sharing" inputMode="numeric" className="field mt-1" /></label><label>Total beds<input name="beds" inputMode="numeric" className="field mt-1" /></label><label>Beds free now<input name="free" inputMode="numeric" className="field mt-1" /></label></> : <label>BHK<input name="bhk" inputMode="decimal" className="field mt-1" /></label>}
          <label className="flex items-end gap-2"><input type="checkbox" name="ac" />AC</label>
          <label className="flex items-end gap-2"><input type="checkbox" name="food" />Food included</label>
          <button className="btn col-span-2 sm:col-span-1 self-end">Add</button>
        </form>}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Photos</h2>
        <div className="grid grid-cols-4 gap-2 mb-3">{(photos ?? []).map((ph) => /* eslint-disable-next-line @next/next/no-img-element */ <div key={ph.id} className="relative"><img src={img(ph.path)} alt="" className="h-24 w-full object-cover rounded" /><span className="absolute bottom-1 left-1 text-[10px] bg-white/90 px-1 rounded">{ph.approved ? 'approved' : 'pending'}</span></div>)}</div>
        <form action={uploadPhoto} className="flex flex-wrap gap-2 items-end text-sm">
          <input type="hidden" name="pid" value={id} />
          <input type="file" name="file" accept="image/*" required className="field !w-auto" />
          <input name="caption" placeholder="Caption (optional)" className="field !w-48" />
          <button className="btn btn-ghost">Upload</button>
        </form>
        <p className="text-xs text-muted mt-1">JPG or PNG, up to 6 MB. Photos appear after our team approves them.</p>
      </section>

      {editable && <form action={submitForReview} className="mt-8 border-t border-line pt-5">
        <input type="hidden" name="pid" value={id} />
        <button className="btn">Submit for review</button>
        <span className="text-sm text-muted ml-3">You need at least one room or price.</span>
      </form>}
    </div>
  );
}
