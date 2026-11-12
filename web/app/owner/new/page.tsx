import Link from 'next/link';
import { requireOwner } from '@/lib/supabase/server';
import OwnerShell from '@/components/OwnerShell';
import ListingFields from '@/components/ListingFields';
import { createListing } from '../actions';

export const metadata = { title: 'Add a property' };

export default async function NewListing() {
  const { user } = await requireOwner('/owner/new');
  return (
    <OwnerShell email={user.email ?? ''}>
      <Link href="/owner" className="btn btn-quiet -ml-2 text-sm">My listings</Link>
      <h1 className="mt-1 text-2xl md:text-3xl">Add a property</h1>
      <ol className="mt-2 flex flex-wrap gap-2 text-sm"><li className="tag tag-ok">1. Details</li><li className="tag">2. Rooms and rent</li><li className="tag">3. Photos and submit</li></ol>
      <form action={createListing} className="mt-5 grid max-w-2xl gap-5">
        <ListingFields />
        <button className="btn btn-primary w-fit">Save and add rooms</button>
      </form>
    </OwnerShell>
  );
}
