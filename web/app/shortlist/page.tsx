import { session } from '@/lib/supabase/server';
import PropertyCard from '@/components/Card';
import type { Card } from '@/lib/queries';

export default async function Shortlist() {
  const { sb, user } = await session();
  const { data } = await sb.from('shortlists').select('properties(id,type,name,gender,address,area_label,category,google_rating,google_reviews,verified,score,lat,lng,cities(name,slug),units(rent,bhk))').eq('user_id', user!.id).order('created_at', { ascending: false });
  const rows = (data ?? []).map((r) => r.properties).filter(Boolean) as unknown as Card[];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Saved stays ({rows.length})</h1>
      {rows.length === 0 ? <p className="text-muted">Nothing saved yet. Use &ldquo;Save to shortlist&rdquo; on any listing.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map((c) => <PropertyCard key={c.id} c={c} />)}</div>}
    </div>
  );
}
