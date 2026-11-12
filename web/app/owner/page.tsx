import Link from 'next/link';
import { requireOwner } from '@/lib/supabase/server';
import { q } from '@/lib/db';
import OwnerShell from '@/components/OwnerShell';
import { StatusTag } from '@/components/StatusTag';
import { claimListing } from './actions';

export const metadata = { title: 'My listings' };

export default async function OwnerHome({ searchParams }: { searchParams: Promise<{ done?: string; claimed?: string }> }) {
  const { user } = await requireOwner();
  const { done, claimed } = await searchParams;
  const rows = await q<{ id: string; name: string; type: string; status: string; rejection_reason: string | null; area_label: string | null; units: number; leads: number }>(
    `select p.id, p.name, p.type, p.status, p.rejection_reason, p.area_label, (select count(*)::int from units u where u.property_id = p.id) units,
     (select count(*)::int from leads l where l.property_id = p.id) leads from properties p where p.owner_id = $1 order by p.created_at desc`, [user.id]);
  return (
    <OwnerShell email={user.email ?? ''}>
      {done === 'password' && <p className="notice mb-4">Password updated.</p>}
      {claimed === 'bad' && <p className="notice notice-warn mb-4">That link is not a listing we can transfer. Check the link, or contact PGhub.</p>}
      {claimed === '1' && <p className="notice mb-4">Claim sent. Our team will check it and add the listing to your account.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl">My listings</h1>
        <Link href="/owner/new" className="btn btn-primary">Add a property</Link>
      </div>
      {rows.length === 0 ? (
        <div className="card mt-5 p-6">
          <p className="font-medium">You have not listed anything yet.</p>
          <p className="mt-1 text-sm text-ink-2">Add your PG, hostel or flat with rooms, rent and photos. Our team checks it, usually within a day, then it goes live and tenants call you.</p>
          <Link href="/owner/new" className="btn btn-primary mt-4">Add your first property</Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/owner/${r.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-accent">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-muted">{r.type === 'pg' ? 'PG or hostel' : 'Rented home'}{r.area_label ? `, ${r.area_label}` : ''}. {r.units} room types, {r.leads} enquiries.</p>
                  {r.rejection_reason && <p className="mt-1 text-sm text-warn-ink">Note from PGhub: {r.rejection_reason}</p>}
                </div>
                <StatusTag status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <details className="card mt-8 max-w-2xl p-4">
        <summary className="cursor-pointer font-medium">Your PG is already on PGhub? Claim it</summary>
        <form action={claimListing} className="mt-3 grid gap-3">
          <label className="label">Link to the listing<input name="link" required className="field" placeholder="https://.../p/..." /></label>
          <label className="label">How can we confirm it is yours?<input name="note" className="field" placeholder="Call me on the number shown on the listing" /></label>
          <button className="btn w-fit">Send claim</button>
        </form>
      </details>
    </OwnerShell>
  );
}
