import Link from 'next/link';
import type { Metadata } from 'next';
import { search, type Filters } from '@/lib/data';
import ListingCard from '@/components/ListingCard';

export const metadata: Metadata = { title: 'Explore PGs and rented homes' };

const CHIPS: { key: keyof Filters; value: string; label: string }[] = [
  { key: 'type', value: 'pg', label: 'PG or hostel' }, { key: 'type', value: 'home', label: 'Rented home' },
  { key: 'gender', value: 'girls', label: 'Girls' }, { key: 'gender', value: 'boys', label: 'Boys' },
  { key: 'food', value: 'with', label: 'With food' }, { key: 'food', value: 'without', label: 'Without food' },
];

export default async function Explore({ searchParams }: { searchParams: Promise<Filters> }) {
  const f = await searchParams;
  const r = await search(f);
  const link = (over: Partial<Filters>) => {
    const p = new URLSearchParams();
    Object.entries({ ...f, page: undefined, ...over }).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    const s = p.toString();
    return s ? `/explore?${s}` : '/explore';
  };
  const activeCount = ['type', 'gender', 'food', 'max', 'q'].filter((k) => f[k as keyof Filters]).length;
  return (
    <div className="wrap py-5 md:py-8">
      <form className="flex gap-2" role="search">
        {(['type', 'gender', 'food', 'max', 'sort', 'city'] as const).map((k) => f[k] ? <input key={k} type="hidden" name={k} value={f[k]} /> : null)}
        <input name="q" defaultValue={f.q ?? ''} className="field" placeholder="Area, sector or name" aria-label="Search by area, sector or name" />
        <button className="btn btn-primary">Search</button>
      </form>

      <div className="scroll-x -mx-4 mt-3 flex gap-2 px-4">
        {CHIPS.map((c) => {
          const on = f[c.key] === c.value;
          return <Link key={c.key + c.value} href={link({ [c.key]: on ? undefined : c.value })} className="chip" aria-current={on ? 'true' : undefined}>{c.label}</Link>;
        })}
      </div>

      <details className="card mt-3 p-3 md:p-4" open={!!(f.max || f.sort)}>
        <summary className="cursor-pointer text-sm font-medium">Budget and sort</summary>
        <form className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_auto]">
          {(['type', 'gender', 'food', 'q', 'city'] as const).map((k) => f[k] ? <input key={k} type="hidden" name={k} value={f[k]} /> : null)}
          <label className="label">Max rent a month
            <select name="max" defaultValue={f.max ?? ''} className="field"><option value="">Any</option>{[5000, 6000, 7000, 8000, 9000, 10000, 15000, 20000].map((n) => <option key={n} value={n}>₹{n.toLocaleString('en-IN')}</option>)}</select>
          </label>
          <label className="label">Sort
            <select name="sort" defaultValue={f.sort ?? ''} className="field"><option value="">Best match</option><option value="price">Rent, low to high</option><option value="new">Newest</option></select>
          </label>
          <button className="btn col-span-2 self-end md:col-span-1">Apply</button>
        </form>
      </details>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h1 className="text-xl md:text-2xl"><span className="num">{r.total}</span> {r.total === 1 ? 'stay' : 'stays'}</h1>
        {activeCount > 0 && <Link href="/explore" className="btn btn-quiet text-sm">Clear filters</Link>}
      </div>
      {f.max && <p className="mt-1 text-sm text-muted">Budget filters show only places with a known rent. Many PGs share their rent on the phone.</p>}

      {r.rows.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="font-medium">Nothing matches these filters.</p>
          <p className="mt-1 text-sm text-muted">Try another area, or remove the budget filter.</p>
          <Link href="/explore" className="btn mt-4">Show everything</Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{r.rows.map((c) => <ListingCard key={c.id} c={c} />)}</div>
      )}

      {r.pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-3">
          {r.page > 1 ? <Link className="btn" href={link({ page: String(r.page - 1) })}>Previous</Link> : <span />}
          <span className="text-sm text-muted">Page <span className="num">{r.page}</span> of <span className="num">{r.pages}</span></span>
          {r.page < r.pages ? <Link className="btn" href={link({ page: String(r.page + 1) })}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
