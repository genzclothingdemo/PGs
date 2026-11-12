import Link from 'next/link';
import { session } from '@/lib/supabase/server';

const ST: Record<string, string> = { draft: 'Draft', submitted: 'Waiting for review', in_review: 'In review', changes_requested: 'Changes requested', rejected: 'Rejected', published: 'Live', paused: 'Paused', expired: 'Expired', archived: 'Archived' };

export default async function Dashboard() {
  const { sb, user } = await session();
  const { data } = await sb.from('properties').select('id,name,type,status,rejection_reason,score,cities(name)').eq('owner_id', user!.id).order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as { id: string; name: string; type: string; status: string; rejection_reason: string | null; score: number; cities: { name: string } | null }[];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-5"><h1 className="text-2xl font-semibold">My listings</h1><Link href="/dashboard/new" className="btn">Add a property</Link></div>
      {rows.length === 0 ? <p className="text-muted">You have not listed anything yet. Add your PG, hostel or rented home. It is free, and our team reviews it before it goes live.</p> : (
        <div className="grid gap-3">{rows.map((r) => (
          <Link key={r.id} href={`/dashboard/${r.id}`} className="bg-card border border-line rounded-lg p-4 flex items-center justify-between hover:border-forest">
            <div><div className="font-semibold">{r.name}</div><div className="text-sm text-muted">{r.type === 'pg' ? 'PG / Hostel' : 'Rented home'} &middot; {r.cities?.name}{r.rejection_reason ? ` · ${r.rejection_reason}` : ''}</div></div>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${r.status === 'published' ? 'bg-[#dfe9e3] text-forest' : r.status === 'rejected' || r.status === 'changes_requested' ? 'bg-[#f6e3dc] text-clay' : 'bg-[#eee6d3] text-gold'}`}>{ST[r.status]}</span>
          </Link>))}</div>)}
    </div>
  );
}
