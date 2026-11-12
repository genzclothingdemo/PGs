import Link from 'next/link';
import { search, stats, topAreas } from '@/lib/data';
import ListingCard from '@/components/ListingCard';

export const dynamic = 'force-dynamic';

const QUICK = [
  { label: 'Girls PG', href: '/explore?type=pg&gender=girls' },
  { label: 'Boys PG', href: '/explore?type=pg&gender=boys' },
  { label: 'PG with food', href: '/explore?type=pg&food=with' },
  { label: 'PG without food', href: '/explore?type=pg&food=without' },
  { label: 'Rented homes', href: '/explore?type=home' },
  { label: 'Under ₹8,000', href: '/explore?max=8000' },
];

export default async function Home() {
  const [s, priced, areas] = await Promise.all([stats(), search({ type: 'pg', sort: '' }, 6), topAreas(12)]);
  return (
    <>
      <section className="border-b border-rule">
        <div className="wrap grid gap-8 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:py-14">
          <div>
            <h1 className="text-[2.1rem] md:text-5xl">Find a PG or a room you can call home.</h1>
            <p className="mt-3 max-w-xl text-ink-2">Rent, sharing, food and area for {s.pg} PGs and {s.home} rented homes in Gandhinagar, with Ahmedabad next. Call the owner yourself, no broker fee.</p>
          </div>
          <form action="/explore" className="card grid gap-3 p-4 md:p-5" role="search">
            <label className="label">Area, sector or name
              <input name="q" className="field" placeholder="Sector 6, Kudasan, Infocity" autoComplete="off" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">Looking for
                <select name="type" className="field" defaultValue="pg"><option value="pg">PG or hostel</option><option value="home">Rented home</option><option value="">Both</option></select>
              </label>
              <label className="label">For
                <select name="gender" className="field" defaultValue=""><option value="">Anyone</option><option value="girls">Girls</option><option value="boys">Boys</option></select>
              </label>
            </div>
            <button className="btn btn-primary">Search stays</button>
          </form>
        </div>
      </section>

      <section className="wrap mt-6">
        <div className="scroll-x -mx-4 flex gap-2 px-4">
          {QUICK.map((x) => <Link key={x.href} href={x.href} className="chip">{x.label}</Link>)}
        </div>
      </section>

      <section className="wrap mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-2xl">PGs with confirmed rent</h2>
          <Link href="/explore?type=pg" className="btn btn-quiet">See all PGs</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{priced.rows.map((c) => <ListingCard key={c.id} c={c} />)}</div>
      </section>

      <section className="wrap mt-12">
        <h2 className="mb-4 text-2xl">Browse by area</h2>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => <Link key={a.area} href={`/explore?q=${encodeURIComponent(a.area)}`} className="chip">{a.area}<span className="num ml-2 text-muted">{a.n}</span></Link>)}
        </div>
      </section>

      <section className="wrap mt-12">
        <div className="card grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
          <div>
            <h2 className="text-2xl">Own a PG or a flat?</h2>
            <p className="mt-1 text-ink-2">List it for free. We check every listing before it goes live, then tenants call you directly.</p>
          </div>
          <Link href="/list-your-property" className="btn btn-primary">List your property</Link>
        </div>
      </section>
    </>
  );
}
