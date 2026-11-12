import 'server-only';
import { one } from './db';

/** Parse the shared listing form into column values. */
export async function readListingForm(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const digits = (k: string) => s(k).replace(/\D/g, '').slice(-10) || null;
  const loc = s('location');
  const m = loc.match(/(-?\d{1,3}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/) || loc.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || loc.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const city = await one<{ id: number }>(`select id from cities where slug = $1`, [s('city') || 'gandhinagar']);
  const type = s('type') === 'home' ? 'home' : 'pg';
  const food = s('food');
  return {
    type, gender: type === 'pg' && ['girls', 'boys', 'both', 'not_stated'].includes(s('gender')) ? s('gender') : 'not_stated',
    city_id: city?.id ?? 1, owner_kind: ['owner', 'manager', 'broker'].includes(s('owner_kind')) ? s('owner_kind') : 'owner',
    name: s('name').slice(0, 120) || 'Untitled', address: s('address').slice(0, 300) || null, area_label: s('area').slice(0, 80) || null,
    lat: m ? Number(m[1]) : null, lng: m ? Number(m[2]) : null, phone: digits('phone'), whatsapp: digits('whatsapp'),
    food_option: ['included', 'tiffin', 'optional', 'self_cook', 'none'].includes(food) ? food : null, gate_time: s('gate_time').slice(0, 40) || null,
    amenities: fd.getAll('amenities').map(String).slice(0, 20), rules: s('rules').slice(0, 1000) || null, description: s('description').slice(0, 2000) || null,
  };
}
export const LISTING_COLS = ['type', 'gender', 'city_id', 'owner_kind', 'name', 'address', 'area_label', 'lat', 'lng', 'phone', 'whatsapp', 'food_option', 'gate_time', 'amenities', 'rules', 'description'] as const;

/** Units form: one row per submit. */
export function readUnitForm(fd: FormData) {
  const n = (k: string) => { const x = Number(String(fd.get(k) ?? '').replace(/[^\d.]/g, '')); return x > 0 ? x : null; };
  const rent = n('rent');
  if (!rent) return null;
  const sharing = n('sharing');
  return { label: String(fd.get('label') ?? '').trim().slice(0, 60) || (sharing ? (sharing === 1 ? 'Single room' : `${sharing} sharing`) : null), sharing: sharing ? Math.round(sharing) : null, bhk: n('bhk'),
    rent: Math.round(rent), deposit: n('deposit') ? Math.round(n('deposit')!) : null, ac: fd.get('ac') === 'on', food_included: fd.get('food_included') === 'on',
    beds_total: n('beds') ? Math.round(n('beds')!) : null, beds_available: n('free') ? Math.round(n('free')!) : null };
}
