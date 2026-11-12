import Link from 'next/link';
import { FOOD, GENDER, photoUrl, type Card } from '@/lib/format';
import SaveButton from './SaveButton';

export function GenderTag({ type, gender }: { type: string; gender: string }) {
  if (type === 'home') return <span className="tag tag-home">Rented home</span>;
  if (gender === 'not_stated') return <span className="tag">PG or hostel</span>;
  return <span className={`tag tag-${gender}`}>{GENDER[gender]}</span>;
}

export function rentLine(c: Pick<Card, 'type' | 'min_rent' | 'sharing' | 'bhk'>) {
  if (!c.min_rent) return null;
  const extra = c.type === 'home' ? (c.bhk ? `${c.bhk} BHK` : null) : c.sharing?.length ? `${c.sharing.join(', ')} sharing` : null;
  return { rent: c.min_rent, extra };
}

export default function ListingCard({ c }: { c: Card }) {
  const r = rentLine(c);
  return (
    <article className="card relative flex flex-col overflow-hidden">
      {c.photo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={photoUrl(c.photo)} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <GenderTag type={c.type} gender={c.gender} />
          <SaveButton id={c.id} compact />
        </div>
        <h3 className="text-lg"><Link href={`/p/${c.id}`} className="after:absolute after:inset-0 hover:underline">{c.name}</Link></h3>
        <p className="line-clamp-1 text-sm text-muted">{[c.area_label, c.city].filter(Boolean).join(', ')}</p>
        <div className="mt-auto pt-2">
          {r ? <p className="whitespace-nowrap text-lg font-semibold"><span className="num">₹{r.rent.toLocaleString('en-IN')}</span><span className="text-sm font-normal text-muted"> a month{r.extra ? `, ${r.extra}` : ''}</span></p>
            : <p className="text-sm text-muted">Rent on request</p>}
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            {c.food_option && <li>{FOOD[c.food_option]}</li>}
            {c.google_rating ? <li><span className="num">{Number(c.google_rating).toFixed(1)}</span> on Google ({c.google_reviews})</li> : null}
          </ul>
        </div>
      </div>
    </article>
  );
}
