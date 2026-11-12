import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { property, FOOD, photoUrl } from '@/lib/data';
import ListingCard, { GenderTag } from '@/components/ListingCard';
import PhoneReveal from '@/components/PhoneReveal';
import SaveButton from '@/components/SaveButton';
import { requestCallback, reportListing } from './actions';

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await property((await params).id);
  return d ? { title: `${d.p.name}, ${d.p.area_label ?? d.p.city}`, description: `${d.p.type === 'pg' ? 'PG' : 'Rented home'} in ${d.p.area_label ?? d.p.city}. Rent, sharing, food and contact.` } : {};
}

const SENT: Record<string, [string, boolean]> = {
  callback: ['Request sent. The PGhub team will pass it to the owner and call you back.', true],
  report: ['Thanks. Our team will check this listing.', true],
  invalid: ['Please enter your name and a 10-digit mobile number.', false],
  limit: ['You have sent many requests today. Please call the owner directly.', false],
};

export default async function Listing({ params, searchParams }: P) {
  const { id } = await params; const { sent } = await searchParams;
  const d = await property(id);
  if (!d) notFound();
  const { p, units, photos, near } = d;
  const map = p.lat && p.lng ? { embed: `https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.006},${p.lat - 0.004},${p.lng + 0.006},${p.lat + 0.004}&layer=mapnik&marker=${p.lat},${p.lng}`, open: `https://maps.google.com/?q=${p.lat},${p.lng}` } : null;
  const facts: [string, string | null][] = [
    ['Food', p.food_option ? FOOD[p.food_option] : null], ['Entry time', p.gate_time], ['Area', p.area_label], ['Opening hours', p.hours],
    ['Amenities', p.amenities?.length ? p.amenities.join(', ') : null], ['House rules', p.rules], ['Listed by', p.owner_kind ? p.owner_kind[0].toUpperCase() + p.owner_kind.slice(1) : null],
  ];
  const msg = sent ? SENT[sent] : null;
  return (
    <div className="wrap py-5 md:py-8">
      <Link href="/explore" className="btn btn-quiet -ml-2 text-sm">Back to results</Link>
      {msg && <p className={`notice mt-2 ${msg[1] ? '' : 'notice-warn'}`} role="status">{msg[0]}</p>}

      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <GenderTag type={p.type} gender={p.gender} />
            {p.verified === 'unverified' ? <span className="tag tag-wait">Not yet verified</span> : <span className="tag tag-ok">Verified listing</span>}
            {p.category && <span className="tag">{p.category}</span>}
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl">{p.name}</h1>
          <p className="mt-1 text-ink-2">{[p.address, p.area_label, p.city].filter(Boolean).join(', ')}</p>
          {p.google_rating ? <p className="mt-1 text-sm text-muted">Rated <span className="num text-ink">{Number(p.google_rating).toFixed(1)}</span> on Google from {p.google_reviews} reviews</p> : null}

          <div className="card mt-4 grid gap-3 p-4 lg:hidden">
            {units.length > 0 && <p className="text-xl font-semibold"><span className="num">₹{Math.min(...units.map((u) => u.rent)).toLocaleString('en-IN')}</span><span className="text-sm font-normal text-muted"> a month onwards</span></p>}
            <PhoneReveal pid={p.id} hasPhone={p.has_phone} />
            <div className="grid grid-cols-2 gap-2"><SaveButton id={p.id} /><a href="#callback" className="btn w-full">Ask for call back</a></div>
          </div>

          {photos.length > 0 && (
            <div className="scroll-x -mx-4 mt-5 flex snap-x gap-2 px-4">
              {photos.map((ph) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={ph.id} src={photoUrl(ph.path)} alt={ph.caption ?? p.name} className="h-56 w-auto max-w-[85%] snap-start rounded-[14px] object-cover md:h-72" />)}
            </div>
          )}

          <section className="mt-8">
            <h2 className="text-xl">{p.type === 'pg' ? 'Rooms and rent' : 'Rent'}</h2>
            {units.length ? (
              <div className="card mt-3 overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Option</th><th>Rent a month</th><th>Deposit</th>{p.type === 'pg' && <th>Beds free</th>}</tr></thead>
                  <tbody>{units.map((u) => (
                    <tr key={u.id}>
                      <td>{u.label ?? (u.sharing ? `${u.sharing} sharing` : 'Room')}{u.food_included ? ', food included' : ''}{u.furnishing ? `, ${u.furnishing.toLowerCase()}` : ''}{u.area_sqft ? `, ${u.area_sqft} sq ft` : ''}</td>
                      <td className="num font-medium">₹{u.rent.toLocaleString('en-IN')}</td>
                      <td className="num">{u.deposit ? `₹${u.deposit.toLocaleString('en-IN')}` : 'Ask'}</td>
                      {p.type === 'pg' && <td className="num">{u.beds_available ?? 'Ask'}</td>}
                    </tr>))}</tbody>
                </table>
              </div>
            ) : <p className="card mt-3 p-4 text-sm text-ink-2">Rent is not listed yet. Call and ask for the rent by sharing, the deposit and what food is included.</p>}
            {p.description && <p className="mt-3 text-sm text-muted">{p.description}</p>}
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Details</h2>
            <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-rule py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right">{v ?? 'Ask the owner'}</dd></div>
              ))}
            </dl>
          </section>

          {map && (
            <section className="mt-8">
              <h2 className="text-xl">Location</h2>
              <iframe title={`Map of ${p.name}`} src={map.embed} className="mt-3 h-64 w-full rounded-[14px] border border-rule md:h-80" loading="lazy" />
              <a href={map.open} target="_blank" rel="noopener" className="btn mt-3">Directions in Google Maps</a>
            </section>
          )}
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-20">
          <div className="card hidden gap-3 p-4 lg:grid">
            {units.length > 0 && <p className="text-2xl font-semibold"><span className="num">₹{Math.min(...units.map((u) => u.rent)).toLocaleString('en-IN')}</span><span className="text-base font-normal text-muted"> a month onwards</span></p>}
            <PhoneReveal pid={p.id} hasPhone={p.has_phone} />
            <SaveButton id={p.id} />
            <p className="text-xs text-muted">Visit before you pay any deposit. PGhub does not take payments.</p>
          </div>

          <form id="callback" action={requestCallback} className="card grid gap-3 p-4">
            <input type="hidden" name="pid" value={p.id} />
            <h2 className="text-lg">Ask for a call back</h2>
            <label className="label">Your name<input name="name" required maxLength={80} className="field" autoComplete="name" /></label>
            <label className="label">Mobile number<input name="phone" required inputMode="numeric" pattern="[0-9 +]{10,14}" className="field" autoComplete="tel" /></label>
            <label className="label">Best time to call<select name="when" className="field"><option value="">Any time</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
            <label className="label">Message (optional)<textarea name="message" rows={2} maxLength={500} className="field" placeholder="2 girls, need from 1 December, 3 sharing" /></label>
            <button className="btn btn-primary">Send request</button>
          </form>

          <details id="report" className="card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Report a problem with this listing</summary>
            <form action={reportListing} className="mt-3 grid gap-3">
              <input type="hidden" name="pid" value={p.id} />
              <select name="reason" className="field"><option value="wrong_number">Wrong number</option><option value="full">No beds available</option><option value="closed">Closed</option><option value="fake">Fake listing</option><option value="wrong_info">Wrong details</option><option value="other">Something else</option></select>
              <input name="detail" maxLength={500} className="field" placeholder="What is wrong? (optional)" />
              <button className="btn">Send report</button>
            </form>
          </details>

          {p.source === 'imported' && !p.owner_id && (
            <p className="text-sm text-muted">Is this your property? <Link href="/list-your-property" className="text-accent-deep underline">Claim it and add rent and photos</Link>.</p>
          )}
        </aside>
      </div>

      {near.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl">Nearby</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{near.map((c) => <ListingCard key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  );
}
