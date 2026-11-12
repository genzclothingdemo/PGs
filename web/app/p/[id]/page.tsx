import Link from 'next/link';
import { notFound } from 'next/navigation';
import { property, propertyExtras } from '@/lib/queries';
import { session } from '@/lib/supabase/server';
import Reveal from '@/components/Reveal';
import { G } from '@/components/Card';
import { toggleShortlist, report, review, claim } from './actions';

export default async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params; const { done } = await searchParams;
  const p = await property(id);
  if (!p) notFound();
  const [x, s] = await Promise.all([propertyExtras(id, p.lat, p.lng, p.type), session()]);
  const saved = s.user ? !!(await s.sb.from('shortlists').select('property_id').eq('property_id', id).eq('user_id', s.user.id).maybeSingle()).data : false;
  const city = p.cities?.name;
  const gmap = p.lat && p.lng ? `https://maps.google.com/?q=${p.lat},${p.lng}` : null;
  const embed = p.lat && p.lng ? `https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.006},${p.lat - 0.004},${p.lng + 0.006},${p.lat + 0.004}&layer=mapnik&marker=${p.lat},${p.lng}` : null;
  const msg: Record<string, string> = { report: 'Thanks, our team will check this listing.', review: 'Thanks. Your review will appear after moderation.', claim: 'Claim request sent. We will verify and get back to you.', reviewerr: 'You can review a listing only once.' };
  const img = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${path}`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="text-sm text-muted mb-3"><Link href="/search" className="hover:text-forest">Search</Link> / {city} / {p.type === 'pg' ? 'PG & hostels' : 'Rented homes'}</div>
      {done && msg[done] && <p className="mb-4 text-sm bg-[#dfe9e3] text-forest rounded p-3">{msg[done]}</p>}
      <div className="grid lg:grid-cols-[1fr_340px] gap-8">
        <div>
          <div className="flex flex-wrap gap-2 mb-2 text-xs font-semibold">
            {p.type === 'pg' && <span className="px-2 py-1 rounded bg-[#dfe9e3] text-forest">For {G[p.gender]}</span>}
            {p.verified === 'unverified' ? <span className="px-2 py-1 rounded bg-[#eee6d3] text-gold">Unverified - from public listings</span> : <span className="px-2 py-1 rounded bg-forest text-white">{p.verified === 'admin_verified' ? 'Verified by PGhub' : 'Owner verified'}</span>}
            {p.category && <span className="px-2 py-1 rounded bg-line">{p.category}</span>}
          </div>
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <p className="text-muted mt-1">{p.address || p.area_label || 'Address not listed'}, {city}</p>

          {x.photos.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2">{x.photos.slice(0, 6).map((ph) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={ph.id} src={img(ph.path)} alt={ph.caption || p.name} className="h-32 w-full object-cover rounded" />)}</div>}

          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-3">{p.type === 'pg' ? 'Rooms & prices' : 'Rent'}</h2>
            {x.units.length ? (
              <table className="w-full text-sm bg-card border border-line rounded-lg overflow-hidden">
                <thead className="text-left text-muted bg-paper"><tr><th className="p-3">Option</th><th className="p-3">Rent / month</th><th className="p-3">Deposit</th><th className="p-3">Beds free</th></tr></thead>
                <tbody>{x.units.map((u) => <tr key={u.id} className="border-t border-line"><td className="p-3">{u.label}{u.ac ? ' · AC' : ''}{u.food_included ? ' · food' : ''}{u.area_sqft ? ` · ${u.area_sqft} sq ft` : ''}</td><td className="p-3 font-semibold">&#8377;{u.rent.toLocaleString('en-IN')}</td><td className="p-3">{u.deposit ? `₹${u.deposit.toLocaleString('en-IN')}` : '-'}</td><td className="p-3">{u.beds_available ?? '-'}</td></tr>)}</tbody>
              </table>
            ) : <p className="text-muted text-sm bg-card border border-line rounded-lg p-4">The owner has not added room prices yet. Call to ask for rent by sharing (2 / 3 / 4), food and deposit.</p>}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Details</h2>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {([['Hours (Maps)', p.hours], ['Gate timing', p.gate_time], ['Food', p.food_option], ['Area', p.area_label], ['Amenities', p.amenities?.join(', ')], ['Rules', p.rules]] as [string, string | null][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line py-2"><dt className="text-muted">{k}</dt><dd className="text-right">{v || 'Not listed'}</dd></div>))}
            </dl>
            {p.description && <p className="mt-4 text-sm whitespace-pre-line">{p.description}</p>}
          </section>

          {embed && <section className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Location</h2>
            <iframe title="Map" src={embed} className="w-full h-72 rounded-lg border border-line" loading="lazy" />
            <div className="mt-2 text-sm"><a className="text-forest font-semibold" href={gmap!} target="_blank">Open in Google Maps</a></div>
          </section>}

          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-3">Reviews on PGhub</h2>
            {x.reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet. Stayed here? Be the first.</p> : x.reviews.map((r) => (
              <div key={r.id} className="border-b border-line py-3 text-sm"><b className="text-gold">{r.rating_overall}/5</b> <span className="text-muted">by {r.profiles?.full_name || 'a resident'} &middot; {new Date(r.created_at).toLocaleDateString('en-IN')}</span>{r.body && <p className="mt-1">{r.body}</p>}</div>))}
            {s.user ? (
              <form action={review} className="mt-4 grid gap-3 bg-card border border-line rounded-lg p-4 text-sm">
                <input type="hidden" name="pid" value={id} />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{([['overall', 'Overall'], ['food', 'Food'], ['clean', 'Clean'], ['safety', 'Safety'], ['owner', 'Owner']] as const).map(([k, l]) => (
                  <label key={k}>{l}<select name={k} className="field mt-1" defaultValue={k === 'overall' ? '4' : ''}>{k !== 'overall' && <option value="">-</option>}{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></label>))}</div>
                <textarea name="body" rows={3} className="field" placeholder="What was it like to stay here?" />
                <button className="btn w-fit">Submit review</button>
              </form>) : <Link href={`/login?next=/p/${id}`} className="text-forest text-sm font-semibold">Sign in to write a review</Link>}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 h-fit grid gap-4">
          <div className="bg-card border border-line rounded-lg p-5 grid gap-3">
            {p.google_rating && <div><span className="text-3xl font-display font-semibold text-gold">{Number(p.google_rating).toFixed(1)}</span> <span className="text-sm text-muted">Google rating &middot; {p.google_reviews} reviews</span></div>}
            <Reveal pid={id} loggedIn={!!s.user} />
            <form action={toggleShortlist.bind(null, id)}><button className="btn btn-ghost w-full">{saved ? 'Saved - remove' : 'Save to shortlist'}</button></form>
            <p className="text-xs text-muted">Phone numbers are shown after sign-in to prevent spam.</p>
          </div>
          {p.source === 'imported' && !p.owner_id && (
            <form action={claim} className="text-sm bg-card border border-line rounded-lg p-4 grid gap-2">
              <input type="hidden" name="pid" value={id} />
              <b>Are you the owner?</b><span className="text-muted text-xs">Claim this listing to add photos, prices and availability.</span>
              <input name="note" className="field" placeholder="Your role and contact" />
              <button className="btn btn-ghost">Claim listing</button>
            </form>)}
          <form action={report} className="text-sm bg-card border border-line rounded-lg p-4 grid gap-2">
            <input type="hidden" name="pid" value={id} />
            <b>Report a problem</b>
            <select name="reason" className="field"><option value="wrong_number">Wrong number</option><option value="full">No beds available</option><option value="closed">Closed</option><option value="fake">Fake listing</option><option value="wrong_info">Wrong information</option><option value="other">Other</option></select>
            <input name="detail" className="field" placeholder="Details (optional)" />
            <button className="btn btn-ghost">Send report</button>
          </form>
        </aside>
      </div>

      {x.near.length > 0 && <section className="mt-12">
        <h2 className="text-xl font-semibold mb-3">Nearby options</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{x.near.map((n) => <Link key={n.id} href={`/p/${n.id}`} className="bg-card border border-line rounded-lg p-3 text-sm hover:border-forest"><b>{n.name}</b><div className="text-muted mt-1">{G[n.gender]}{n.google_rating ? ` · ${n.google_rating} (${n.google_reviews})` : ''}</div></Link>)}</div>
      </section>}
    </div>
  );
}
