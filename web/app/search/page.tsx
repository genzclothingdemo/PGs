import Link from 'next/link';
import { search, type Filters } from '@/lib/queries';
import PropertyCard from '@/components/Card';
export const dynamic = 'force-dynamic';

export default async function Search({ searchParams }: { searchParams: Promise<Filters> }) {
  const f = await searchParams;
  const r = await search(f);
  const qs = (over: Partial<Filters>) => '?' + new URLSearchParams(Object.entries({ ...f, ...over }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 grid lg:grid-cols-[260px_1fr] gap-8">
      <form className="bg-card border border-line rounded-lg p-4 h-fit grid gap-3 text-sm lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">Filters</h2>
        <label>City<select name="city" defaultValue={f.city ?? 'gandhinagar'} className="field mt-1"><option value="gandhinagar">Gandhinagar</option><option value="ahmedabad">Ahmedabad</option></select></label>
        <label>Type<select name="type" defaultValue={f.type ?? ''} className="field mt-1"><option value="">PG &amp; homes</option><option value="pg">PG / Hostel</option><option value="home">Rented home</option></select></label>
        <label>For<select name="gender" defaultValue={f.gender ?? ''} className="field mt-1"><option value="">Anyone</option><option value="girls">Girls</option><option value="boys">Boys</option></select></label>
        <label>Area, sector or name<input name="q" defaultValue={f.q ?? ''} className="field mt-1" placeholder="Sector 3" /></label>
        <div className="grid grid-cols-2 gap-2">
          <label>Min &#8377;<input name="min" inputMode="numeric" defaultValue={f.min ?? ''} className="field mt-1" /></label>
          <label>Max &#8377;<input name="max" inputMode="numeric" defaultValue={f.max ?? ''} className="field mt-1" /></label>
        </div>
        <label>Sort by<select name="sort" defaultValue={f.sort ?? ''} className="field mt-1"><option value="">Best rated</option><option value="reviews">Most reviews</option><option value="price">Price: low to high</option></select></label>
        <button className="btn">Apply</button>
        <Link href="/search" className="text-center text-muted">Clear all</Link>
      </form>
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-2xl font-semibold">{r.total} stays found</h1>
          <span className="text-sm text-muted">Page {r.page} of {Math.max(r.pages, 1)}</span>
        </div>
        {r.rows.length === 0 ? <p className="text-muted">Nothing matches these filters. Try removing the budget or area.</p> : (
          <div className="grid sm:grid-cols-2 gap-4">{r.rows.map((c) => <PropertyCard key={c.id} c={c} />)}</div>
        )}
        <div className="flex gap-3 mt-8">
          {r.page > 1 && <Link className="btn btn-ghost" href={qs({ page: String(r.page - 1) })}>&larr; Previous</Link>}
          {r.page < r.pages && <Link className="btn btn-ghost" href={qs({ page: String(r.page + 1) })}>Next &rarr;</Link>}
        </div>
      </section>
    </div>
  );
}
