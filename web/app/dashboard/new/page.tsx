import { createProperty } from '../actions';
import { session } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const AMEN = ['WiFi', 'AC', 'Laundry', 'Power backup', 'CCTV', 'Warden', 'Geyser', 'Parking', 'Lift', 'Housekeeping', 'Fridge', 'Study table'];

export default async function NewProperty({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await session();
  if (!user) redirect('/login?next=/dashboard/new');
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">List your property</h1>
      <p className="text-muted text-sm mt-1">Step 1 of 3: basics. Next you add rooms and prices, then photos, then submit for review. Free to list.</p>
      {error && <p className="mt-4 text-sm bg-[#f6e3dc] text-clay rounded p-3">{error}</p>}
      <form action={createProperty} className="mt-6 grid gap-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <label>Type<select name="type" className="field mt-1"><option value="pg">PG / Hostel</option><option value="home">Rented home / flat</option></select></label>
          <label>For (PG)<select name="gender" className="field mt-1"><option value="girls">Girls</option><option value="boys">Boys</option><option value="both">Boys &amp; Girls</option></select></label>
          <label>City<select name="city" className="field mt-1"><option value="gandhinagar">Gandhinagar</option><option value="ahmedabad">Ahmedabad</option></select></label>
          <label>You are<select name="owner_kind" className="field mt-1"><option value="owner">Owner</option><option value="manager">Manager</option><option value="broker">Broker</option></select></label>
        </div>
        <label>Name of the PG / property<input name="name" required className="field mt-1" /></label>
        <label>Address<input name="address" required className="field mt-1" placeholder="Plot / house no, street, landmark" /></label>
        <label>Area or sector<input name="area" className="field mt-1" placeholder="Sector 3, Kudasan, Satellite..." /></label>
        <label>Location on map<input name="location" className="field mt-1" placeholder="Paste a Google Maps link or lat,lng (e.g. 23.2156, 72.6369)" /><span className="text-xs text-muted">Open your place in Google Maps, copy the link or the coordinates.</span></label>
        <div className="grid grid-cols-2 gap-3">
          <label>Phone (shown after sign-in)<input name="phone" required inputMode="tel" className="field mt-1" /></label>
          <label>WhatsApp (optional)<input name="whatsapp" inputMode="tel" className="field mt-1" /></label>
          <label>Food<select name="food" className="field mt-1"><option value="">Not decided</option><option value="included">Food included</option><option value="tiffin">Tiffin available</option><option value="optional">Optional</option><option value="self_cook">Self cooking</option><option value="none">No food</option></select></label>
          <label>Gate / entry timing<input name="gate_time" className="field mt-1" placeholder="e.g. 10:30 PM" /></label>
        </div>
        <fieldset><legend className="mb-1">Amenities</legend><div className="grid grid-cols-3 gap-2">{AMEN.map((a) => <label key={a} className="flex items-center gap-2"><input type="checkbox" name="amenities" value={a} />{a}</label>)}</div></fieldset>
        <label>House rules<textarea name="rules" rows={2} className="field mt-1" placeholder="Guests, smoking, visiting hours..." /></label>
        <label>Description<textarea name="description" rows={3} className="field mt-1" /></label>
        <button className="btn w-fit">Save and add rooms &rarr;</button>
      </form>
    </div>
  );
}
