import Link from 'next/link';
import { redirect } from 'next/navigation';
import { session } from '@/lib/supabase/server';
import { moderate, claimDecision, reviewDecision, reportDecision, photoDecision, recompute } from './actions';

type Q = { id: string; name: string; type: string; status: string; address: string | null; created_at: string; cities: { name: string } | null; profiles: { full_name: string; email: string } | null };

export default async function Admin() {
  const { sb, staff, admin } = await session();
  if (!staff) redirect('/');
  const [queue, claims, reports, reviews, photos, counts] = await Promise.all([
    sb.from('properties').select('id,name,type,status,address,created_at,cities(name),profiles:owner_id(full_name,email)').in('status', ['submitted', 'in_review']).order('created_at'),
    sb.from('claims').select('id,note,created_at,properties(name),profiles:user_id(full_name,email)').eq('status', 'pending'),
    sb.from('reports').select('id,reason,detail,created_at,properties(id,name)').eq('status', 'open').order('created_at'),
    sb.from('reviews').select('id,rating_overall,body,properties(name),profiles:user_id(full_name)').eq('status', 'pending'),
    sb.from('photos').select('id,path,properties(name)').eq('approved', false).limit(30),
    Promise.all(['published', 'submitted', 'draft'].map((s) => sb.from('properties').select('id', { count: 'exact', head: true }).eq('status', s))),
  ]);
  const img = (p: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${p}`;
  const Box = ({ t, n, children }: { t: string; n: number; children: React.ReactNode }) => (
    <section className="mt-8"><h2 className="text-lg font-semibold mb-2">{t} <span className="text-muted text-sm font-normal">({n})</span></h2>{n === 0 ? <p className="text-sm text-muted">Nothing waiting.</p> : <div className="grid gap-3">{children}</div>}</section>);
  const rows = (queue.data ?? []) as unknown as Q[];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex gap-3 text-sm">{admin && <Link className="btn btn-ghost !py-1.5" href="/admin/users">Users &amp; roles</Link>}{admin && <form action={recompute}><button className="btn btn-ghost !py-1.5">Recompute ranking</button></form>}</div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4 text-sm">{[['Live', counts[0].count], ['Waiting for review', counts[1].count], ['Drafts', counts[2].count]].map(([l, n]) => <div key={String(l)} className="bg-card border border-line rounded-lg p-3"><div className="text-2xl font-display font-semibold">{n}</div><div className="text-muted">{l}</div></div>)}</div>

      <Box t="Approval queue" n={rows.length}>{rows.map((r) => (
        <div key={r.id} className="bg-card border border-line rounded-lg p-4 text-sm">
          <div className="flex justify-between gap-3"><div><Link className="font-semibold text-forest" href={`/p/${r.id}`}>{r.name}</Link><div className="text-muted">{r.type === 'pg' ? 'PG' : 'Home'} &middot; {r.cities?.name} &middot; {r.address}</div><div className="text-muted">Owner: {r.profiles?.full_name} ({r.profiles?.email})</div></div></div>
          <form action={moderate} className="mt-3 flex flex-wrap gap-2 items-center"><input type="hidden" name="id" value={r.id} />
            <input name="why" placeholder="Reason (for reject / changes)" className="field !w-64" />
            <button name="act" value="approve" className="btn !py-1.5">Approve</button>
            <button name="act" value="changes" className="btn btn-ghost !py-1.5">Ask changes</button>
            <button name="act" value="reject" className="btn btn-ghost !py-1.5 !text-clay !border-clay">Reject</button></form>
        </div>))}</Box>

      <Box t="Photos to approve" n={photos.data?.length ?? 0}><div className="grid grid-cols-3 sm:grid-cols-5 gap-3">{(photos.data ?? []).map((p) => { const pr = p as unknown as { id: string; path: string; properties: { name: string } | null }; return (
        <form key={pr.id} action={photoDecision} className="text-xs"><input type="hidden" name="id" value={pr.id} />{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img(pr.path)} alt="" className="h-24 w-full object-cover rounded" /><div className="truncate text-muted">{pr.properties?.name}</div><button name="ok" value="1" className="text-forest font-semibold mr-2">Approve</button><button name="ok" value="0" className="text-clay">Delete</button></form>); })}</div></Box>

      <Box t="Ownership claims" n={claims.data?.length ?? 0}>{(claims.data ?? []).map((c) => { const x = c as unknown as { id: string; note: string; properties: { name: string } | null; profiles: { full_name: string; email: string } | null }; return (
        <form key={x.id} action={claimDecision} className="bg-card border border-line rounded-lg p-4 text-sm flex justify-between gap-3 items-center"><input type="hidden" name="id" value={x.id} />
          <div><b>{x.properties?.name}</b><div className="text-muted">{x.profiles?.full_name} ({x.profiles?.email}) - {x.note}</div></div>
          <div className="flex gap-2"><button name="ok" value="1" className="btn !py-1.5">Approve</button><button name="ok" value="0" className="btn btn-ghost !py-1.5">Reject</button></div></form>); })}</Box>

      <Box t="Reports" n={reports.data?.length ?? 0}>{(reports.data ?? []).map((r) => { const x = r as unknown as { id: string; reason: string; detail: string | null; properties: { id: string; name: string } | null }; return (
        <form key={x.id} action={reportDecision} className="bg-card border border-line rounded-lg p-4 text-sm flex justify-between gap-3 items-center"><input type="hidden" name="id" value={x.id} />
          <div><Link href={`/p/${x.properties?.id}`} className="font-semibold text-forest">{x.properties?.name}</Link><div className="text-muted">{x.reason.replace('_', ' ')} {x.detail && `- ${x.detail}`}</div></div>
          <div className="flex gap-2"><button name="status" value="resolved" className="btn !py-1.5">Resolved</button><button name="status" value="dismissed" className="btn btn-ghost !py-1.5">Dismiss</button></div></form>); })}</Box>

      <Box t="Reviews to moderate" n={reviews.data?.length ?? 0}>{(reviews.data ?? []).map((r) => { const x = r as unknown as { id: string; rating_overall: number; body: string | null; properties: { name: string } | null; profiles: { full_name: string } | null }; return (
        <form key={x.id} action={reviewDecision} className="bg-card border border-line rounded-lg p-4 text-sm flex justify-between gap-3 items-center"><input type="hidden" name="id" value={x.id} />
          <div><b>{x.properties?.name}</b> - {x.rating_overall}/5 by {x.profiles?.full_name}<div className="text-muted">{x.body}</div></div>
          <div className="flex gap-2"><button name="ok" value="1" className="btn !py-1.5">Approve</button><button name="ok" value="0" className="btn btn-ghost !py-1.5">Reject</button></div></form>); })}</Box>
    </div>
  );
}
