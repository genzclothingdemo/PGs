import Link from 'next/link';
import { minRent, type Card } from '@/lib/queries';
export const G: Record<string, string> = { boys: 'Boys', girls: 'Girls', both: 'Boys & Girls', not_stated: 'Not stated' };
export function Stars({ r, n }: { r: number | null; n: number | null }) {
  if (!r) return <span className="text-muted text-sm">No rating yet</span>;
  return <span className="text-sm"><b className="text-gold">{Number(r).toFixed(1)}</b> <span className="text-muted">Google &middot; {n} reviews</span></span>;
}
export default function PropertyCard({ c }: { c: Card }) {
  const rent = minRent(c);
  const bhk = c.units.find((u) => u.bhk)?.bhk;
  return (
    <Link href={`/p/${c.id}`} className="block bg-card border border-line rounded-lg p-4 hover:border-forest transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{c.type === 'pg' ? 'PG / Hostel' : c.category || 'Rented home'} &middot; {c.cities?.name}</div>
          <h3 className="text-lg font-semibold leading-snug mt-0.5">{c.name}</h3>
        </div>
        {c.type === 'pg' && <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded ${c.gender === 'girls' ? 'bg-[#f6e3dc] text-clay' : c.gender === 'boys' ? 'bg-[#dfe9e3] text-forest' : 'bg-[#eee6d3] text-gold'}`}>{G[c.gender]}</span>}
      </div>
      <p className="text-sm text-muted mt-1 line-clamp-1">{c.address || c.area_label || 'Address not listed'}</p>
      <div className="mt-3 flex items-end justify-between">
        <Stars r={c.google_rating} n={c.google_reviews} />
        <div className="text-right">
          {rent ? <div className="font-semibold">&#8377;{rent.toLocaleString('en-IN')}<span className="text-xs text-muted font-normal">/mo{c.type === 'home' && bhk ? ` · ${bhk} BHK` : ''}</span></div> : <div className="text-sm text-muted">Price on request</div>}
          {c.verified === 'unverified' ? <div className="text-[11px] text-muted">Unverified listing</div> : <div className="text-[11px] text-forest font-semibold">Verified</div>}
        </div>
      </div>
    </Link>
  );
}
