export const AMENITIES = ['WiFi', 'AC', 'Laundry', 'Power backup', 'CCTV', 'Warden', 'Hot water', 'Parking', 'Lift', 'Housekeeping', 'Fridge', 'Study table', 'Drinking water', 'Attached bathroom'];

export type ListingValues = { type?: string; gender?: string; city_slug?: string; owner_kind?: string; name?: string; address?: string; area_label?: string; lat?: number | null; lng?: number | null;
  phone?: string | null; whatsapp?: string | null; food_option?: string | null; gate_time?: string | null; amenities?: string[] | null; rules?: string | null; description?: string | null };

/** The listing form body, shared by the owner and the admin. */
export default function ListingFields({ v = {}, admin = false }: { v?: ListingValues; admin?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Type<select name="type" className="field" defaultValue={v.type ?? 'pg'}><option value="pg">PG or hostel</option><option value="home">Rented home or flat</option></select></label>
        <label className="label">For (PG only)<select name="gender" className="field" defaultValue={v.gender ?? 'girls'}><option value="girls">Girls</option><option value="boys">Boys</option><option value="both">Boys and girls</option><option value="not_stated">Not stated</option></select></label>
        <label className="label">City<select name="city" className="field" defaultValue={v.city_slug ?? 'gandhinagar'}><option value="gandhinagar">Gandhinagar</option><option value="ahmedabad">Ahmedabad</option></select></label>
        <label className="label">{admin ? 'Listed by' : 'You are'}<select name="owner_kind" className="field" defaultValue={v.owner_kind ?? 'owner'}><option value="owner">Owner</option><option value="manager">Manager</option><option value="broker">Broker</option></select></label>
      </div>
      <label className="label">Name of the PG or property<input name="name" required maxLength={120} className="field" defaultValue={v.name ?? ''} /></label>
      <label className="label">Address<input name="address" required maxLength={300} className="field" defaultValue={v.address ?? ''} placeholder="Plot or house number, street, landmark" /></label>
      <label className="label">Area or sector<input name="area" maxLength={80} className="field" defaultValue={v.area_label ?? ''} placeholder="Sector 6, Kudasan, Satellite" /></label>
      <label className="label">Location on the map
        <input name="location" className="field" defaultValue={v.lat ? `${v.lat}, ${v.lng}` : ''} placeholder="Paste a Google Maps link or 23.2156, 72.6369" />
        <span className="text-xs font-normal text-muted">In Google Maps, press and hold on your building, then copy the numbers that appear.</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Phone for tenants<input name="phone" required inputMode="numeric" className="field" defaultValue={v.phone ?? ''} placeholder="10 digits" /></label>
        <label className="label">WhatsApp (if different)<input name="whatsapp" inputMode="numeric" className="field" defaultValue={v.whatsapp ?? ''} /></label>
        <label className="label">Food<select name="food" className="field" defaultValue={v.food_option ?? ''}><option value="">Not decided</option><option value="included">Food included</option><option value="tiffin">Tiffin available</option><option value="optional">Food optional</option><option value="self_cook">Self cooking</option><option value="none">No food</option></select></label>
        <label className="label">Entry time at night<input name="gate_time" maxLength={40} className="field" defaultValue={v.gate_time ?? ''} placeholder="10:30 PM, or no limit" /></label>
      </div>
      <fieldset>
        <legend className="mb-2 text-[.9rem] font-medium text-ink-2">Amenities</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENITIES.map((a) => <label key={a} className="flex min-h-11 items-center gap-2 rounded-[10px] border border-rule bg-surface px-3 text-sm"><input type="checkbox" name="amenities" value={a} defaultChecked={v.amenities?.includes(a)} className="h-4 w-4 accent-[var(--color-accent)]" />{a}</label>)}
        </div>
      </fieldset>
      <label className="label">House rules<textarea name="rules" rows={2} maxLength={1000} className="field" defaultValue={v.rules ?? ''} placeholder="Guests, visiting hours, smoking" /></label>
      <label className="label">About the place<textarea name="description" rows={3} maxLength={2000} className="field" defaultValue={v.description ?? ''} /></label>
    </div>
  );
}
