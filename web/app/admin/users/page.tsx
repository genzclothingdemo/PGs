import Link from 'next/link';
import { redirect } from 'next/navigation';
import { session } from '@/lib/supabase/server';
import { setRole } from '../actions';

const ROLES = ['owner', 'moderator', 'admin'] as const;
export default async function Users() {
  const { sb, admin } = await session();
  if (!admin) redirect('/admin');
  const [{ data: users }, { data: roles }, { data: log }] = await Promise.all([
    sb.from('profiles').select('id,full_name,email,created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('user_roles').select('user_id,role'),
    sb.from('audit_log').select('id,action,entity,entity_id,at').order('at', { ascending: false }).limit(15),
  ]);
  const by = new Map<string, string[]>();
  (roles ?? []).forEach((r) => by.set(r.user_id, [...(by.get(r.user_id) ?? []), r.role]));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/admin" className="text-sm text-muted">&larr; Admin</Link>
      <h1 className="text-2xl font-semibold mt-1 mb-4">Users &amp; roles</h1>
      <div className="grid gap-2">{(users ?? []).map((u) => { const has = by.get(u.id) ?? []; return (
        <div key={u.id} className="bg-card border border-line rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <div><b>{u.full_name}</b> <span className="text-muted">{u.email}</span><div className="text-xs text-muted">{has.join(', ')}</div></div>
          <div className="flex gap-2">{ROLES.map((r) => { const on = has.includes(r); return (
            <form key={r} action={setRole}><input type="hidden" name="uid" value={u.id} /><input type="hidden" name="role" value={r} /><input type="hidden" name="grant" value={on ? '0' : '1'} />
              <button className={`px-2 py-1 rounded text-xs font-semibold border ${on ? 'bg-forest text-white border-forest' : 'border-line text-muted'}`}>{on ? '✓ ' : '+ '}{r}</button></form>); })}</div>
        </div>); })}</div>
      <h2 className="text-lg font-semibold mt-8 mb-2">Recent admin activity</h2>
      <ul className="text-sm text-muted">{(log ?? []).map((l) => <li key={l.id}>{new Date(l.at).toLocaleString('en-IN')} &middot; {l.action} &middot; {l.entity} {l.entity_id?.slice(0, 8)}</li>)}</ul>
    </div>
  );
}
