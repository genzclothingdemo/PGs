import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import AdminShell from '@/components/AdminShell';
import ListingFields from '@/components/ListingFields';
import { saveListing } from '../../actions';

export default async function AdminNewListing() {
  await requireAdmin();
  return (
    <AdminShell active="/admin/listings">
      <Link href="/admin/listings" className="btn btn-quiet -ml-2 text-sm">All listings</Link>
      <h1 className="mt-1 text-2xl">Add a listing</h1>
      <p className="text-sm text-muted">For PGs you have called or visited. Rooms and rent come on the next screen.</p>
      <form action={saveListing} className="mt-5 grid max-w-3xl gap-5">
        <ListingFields admin />
        <div className="grid grid-cols-2 gap-3">
          <label className="label">Verification<select name="verified" className="field" defaultValue="admin_verified"><option value="admin_verified">Verified by PGhub</option><option value="phone_verified">Phone confirmed</option><option value="unverified">Not verified</option></select></label>
          <label className="label">Publish<select name="status" className="field" defaultValue="published"><option value="published">Live now</option><option value="draft">Keep as draft</option></select></label>
        </div>
        <label className="label">Private notes for the team<textarea name="admin_notes" rows={2} className="field" /></label>
        <button className="btn btn-primary w-fit">Save and add rooms</button>
      </form>
    </AdminShell>
  );
}
