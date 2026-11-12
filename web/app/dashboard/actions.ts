'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/supabase/server';

function coords(s: string): [number | null, number | null] {
  const m = s.match(/(-?\d{1,3}\.\d{3,})\s*[,/ ]\s*(-?\d{1,3}\.\d{3,})/) || s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}
const num = (v: FormDataEntryValue | null) => { const n = Number(String(v ?? '').replace(/\D/g, '')); return n > 0 ? n : null; };

export async function createProperty(fd: FormData) {
  const { sb, user } = await session();
  if (!user) redirect('/login?next=/dashboard/new');
  await sb.rpc('become_owner');
  const type = fd.get('type') === 'home' ? 'home' : 'pg';
  const [lat, lng] = coords(String(fd.get('location') || ''));
  const { data: city } = await sb.from('cities').select('id').eq('slug', String(fd.get('city') || 'gandhinagar')).single();
  const { data, error } = await sb.from('properties').insert({
    type, owner_id: user.id, source: 'owner', status: 'draft', name: String(fd.get('name') || '').trim().slice(0, 120) || 'Untitled',
    gender: type === 'pg' ? String(fd.get('gender') || 'not_stated') : 'not_stated', description: String(fd.get('description') || '').slice(0, 2000),
    address: String(fd.get('address') || '').slice(0, 300), area_label: String(fd.get('area') || '').slice(0, 80), city_id: city?.id, lat, lng,
    owner_kind: String(fd.get('owner_kind') || 'owner'), gate_time: String(fd.get('gate_time') || '') || null, food_option: String(fd.get('food') || '') || null,
    amenities: fd.getAll('amenities').map(String), rules: String(fd.get('rules') || '').slice(0, 1000),
  }).select('id').single();
  if (error || !data) redirect(`/dashboard/new?error=${encodeURIComponent(error?.message ?? 'failed')}`);
  // phone is write-only for the owner: set through an update on the column (allowed for own draft rows)
  await sb.from('properties').update({ phone: String(fd.get('phone') || '').replace(/\D/g, '').slice(-10) || null, whatsapp: String(fd.get('whatsapp') || '').replace(/\D/g, '').slice(-10) || null }).eq('id', data.id);
  redirect(`/dashboard/${data.id}`);
}

export async function addUnit(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb } = await session();
  const rent = num(fd.get('rent'));
  if (rent) await sb.from('units').insert({ property_id: pid, label: String(fd.get('label') || '').slice(0, 60), sharing: num(fd.get('sharing')), bhk: num(fd.get('bhk')), rent, deposit: num(fd.get('deposit')), ac: fd.get('ac') === 'on', food_included: fd.get('food') === 'on', beds_total: num(fd.get('beds')), beds_available: num(fd.get('free')) });
  revalidatePath(`/dashboard/${pid}`);
}
export async function removeUnit(fd: FormData) {
  const { sb } = await session();
  await sb.from('units').delete().eq('id', String(fd.get('id')));
  revalidatePath(`/dashboard/${fd.get('pid')}`);
}
export async function uploadPhoto(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb, user } = await session();
  const f = fd.get('file') as File | null;
  if (user && f && f.size > 0 && f.size < 6_000_000 && f.type.startsWith('image/')) {
    const path = `${user.id}/${pid}/${Date.now()}-${f.name.replace(/[^\w.]/g, '_')}`;
    const up = await sb.storage.from('property-photos').upload(path, f, { contentType: f.type });
    if (!up.error) await sb.from('photos').insert({ property_id: pid, path, caption: String(fd.get('caption') || '').slice(0, 100) });
  }
  revalidatePath(`/dashboard/${pid}`);
}
export async function submitForReview(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb } = await session();
  const { error } = await sb.rpc('submit_property', { pid });
  redirect(`/dashboard/${pid}?${error ? 'error=' + encodeURIComponent(error.message) : 'done=submitted'}`);
}
