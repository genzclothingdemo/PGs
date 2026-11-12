import Link from 'next/link';
import { search, stats } from '@/lib/queries';
import PropertyCard from '@/components/Card';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [s, top] = await Promise.all([stats(), search({ type: 'pg', sort: 'rating' }, 6)]);
  const points: [string, string][] = [
    ['Honest ratings', 'Ratings are adjusted for the number of reviews, so a 5.0 from two people does not beat 4.8 from two hundred.'],
    ['Phone numbers stay private', 'Sign in to see contact details. Owners can claim and verify their own listing.'],
    ['Made for people who commute', 'Pick your office or college and see which stays are actually close.'],
  ];
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-[1.1]">A room you can trust, <br />near where you work or study.</h1>
            <p className="mt-4 text-muted max-w-xl">{s.pg ?? 0} PGs &amp; hostels and {s.home ?? 0} rented homes across Gandhinagar, with price, sharing, food and gate timing in one place. Ahmedabad is coming next.</p>
          </div>
          <form action="/search" className="bg-card border border-line rounded-lg p-5 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">City<select name="city" className="field mt-1" defaultValue="gandhinagar"><option value="gandhinagar">Gandhinagar</option><option value="ahmedabad">Ahmedabad</option></select></label>
              <label className="text-sm">Looking for<select name="type" className="field mt-1"><option value="pg">PG / Hostel</option><option value="home">Rented home</option></select></label>
              <label className="text-sm">For<select name="gender" className="field mt-1"><option value="">Anyone</option><option value="girls">Girls</option><option value="boys">Boys</option></select></label>
              <label className="text-sm">Max budget (&#8377;/mo)<input name="max" inputMode="numeric" placeholder="e.g. 8000" className="field mt-1" /></label>
            </div>
            <label className="text-sm">Area, sector or name<input name="q" placeholder="Sector 3, Kudasan, Sargasan..." className="field mt-1" /></label>
            <button className="btn">Search</button>
          </form>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 mt-12">
        <div className="flex items-end justify-between mb-4"><h2 className="text-2xl font-semibold">Highly rated PGs in Gandhinagar</h2><Link href="/search?type=pg" className="text-forest text-sm font-semibold">See all &rarr;</Link></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{top.rows.map((c) => <PropertyCard key={c.id} c={c} />)}</div>
      </section>
      <section className="mx-auto max-w-6xl px-4 mt-14 grid md:grid-cols-3 gap-6 text-sm">
        {points.map(([t, d]) => (
          <div key={t} className="border-t-2 border-forest pt-3"><h3 className="text-lg font-semibold">{t}</h3><p className="text-muted mt-1">{d}</p></div>
        ))}
      </section>
    </>
  );
}
