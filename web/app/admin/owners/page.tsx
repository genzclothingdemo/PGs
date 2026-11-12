import { requireAdmin } from '@/lib/admin';
import { q } from '@/lib/db';
import AdminShell from '@/components/AdminShell';
import { setOwnerRole } from '../actions';

export default async function Owners() {
  await requireAdmin();
  const rows = await q<{ id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string; confirmed: boolean; is_owner: boolean; listings: number; live: number }>(
    `select pr.id, pr.full_name, pr.email, pr.phone, pr.created_at, (u.email_confirmed_at is not null) confirmed,
       exists (select 1 from user_roles r where r.user_id = pr.id and r.role = 'owner') is_owner,
       (select count(*)::int from properties p where p.owner_id = pr.id) listings, (select count(*)::int from properties p where p.owner_id = pr.id and p.status = 'published') live
     from profiles pr join auth.users u on u.id = pr.id order by pr.created_at desc limit 200`);
  return (
    <AdminShell active="/admin/owners">
      <h1 className="text-2xl">Owners <span className="num text-base font-normal text-muted">{rows.length}</span></h1>
      <p className="text-sm text-muted">Everyone who created an owner account. Removing access stops them adding listings; their live listings stay until you pause them.</p>
      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Owner</th><th>Mobile</th><th>Email confirmed</th><th>Listings</th><th>Joined</th><th><span className="sr-only">Access</span></th></tr></thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.id}>
                <td>{r.full_name ?? 'No name'}<span className="block text-xs text-muted">{r.email}</span></td>
                <td className="num">{r.phone ?? 'None'}</td>
                <td>{r.confirmed ? 'Yes' : 'Not yet'}</td>
                <td className="num">{r.listings} <span className="text-muted">({r.live} live)</span></td>
                <td className="num">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td><form action={setOwnerRole}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="block" value={r.is_owner ? '1' : '0'} /><button className="btn btn-quiet text-sm">{r.is_owner ? 'Remove access' : 'Allow listing'}</button></form></td>
              </tr>
            )) : <tr><td colSpan={6} className="text-muted">No owner accounts yet. They appear when someone signs up on List your property.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
