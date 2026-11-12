'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/supabase/server';
import { one, q } from '@/lib/db';
import { readListingForm, readUnitForm, LISTING_COLS } from '@/lib/listing-form';

const okId = (id: string) => /^[0-9a-f-]{36}$/.test(id);
async function mine(pid: string, userId: string) {
  if (!okId(pid)) return null;
  return one<{ id: string; status: string }>(`select id, status from properties where id = $1 and owner_id = $2`, [pid, userId]);
}
const EDITABLE = ['draft', 'changes_requested', 'rejected'];

export async function createListing(fd: FormData) {
  const { user } = await requireOwner('/owner/new');
  await q(`insert into user_roles (user_id, role) values ($1, 'owner') on conflict do nothing`, [user.id]);
  const v = await readListingForm(fd);
  const cols = LISTING_COLS.filter((c) => c !== 'amenities');
  const r = await one<{ id: string }>(
    `insert into properties (${cols.join(',')}, amenities, owner_id, source, status) values (${cols.map((_, i) => `$${i + 1}`).join(',')}, $${cols.length + 1}, $${cols.length + 2}, 'owner', 'draft') returning id`,
    [...cols.map((c) => v[c]), v.amenities, user.id]);
  redirect(`/owner/${r!.id}?step=rooms`);
}

export async function updateListing(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { user } = await requireOwner();
  const p = await mine(pid, user.id);
  if (!p) redirect('/owner');
  const v = await readListingForm(fd);
  // edits to a live listing go back to review
  const status = p.status === 'published' || p.status === 'paused' ? 'submitted' : p.status;
  await q(`update properties set ${LISTING_COLS.map((c, i) => `${c} = $${i + 2}`).join(', ')}, status = $${LISTING_COLS.length + 2}::listing_status where id = $1`, [pid, ...LISTING_COLS.map((c) => v[c]), status]);
  revalidatePath(`/owner/${pid}`);
  redirect(`/owner/${pid}?saved=1`);
}

export async function addUnit(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { user } = await requireOwner();
  const p = await mine(pid, user.id);
  const u = readUnitForm(fd);
  if (p && u) await q(`insert into units (property_id, label, sharing, bhk, rent, deposit, ac, food_included, beds_total, beds_available) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [pid, u.label, u.sharing, u.bhk, u.rent, u.deposit, u.ac, u.food_included, u.beds_total, u.beds_available]);
  revalidatePath(`/owner/${pid}`);
}

export async function removeUnit(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { user } = await requireOwner();
  if (await mine(pid, user.id)) await q(`delete from units where id = $1 and property_id = $2`, [String(fd.get('uid')), pid]);
  revalidatePath(`/owner/${pid}`);
}

export async function uploadPhoto(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb, user } = await requireOwner();
  if (!(await mine(pid, user.id))) redirect('/owner');
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 8);
  let bad = 0;
  for (const f of files) {
    if (!f.type.startsWith('image/') || f.size > 6_000_000) { bad++; continue; }
    const path = `${user.id}/${pid}/${Date.now()}-${f.name.replace(/[^\w.]/g, '_').slice(-60)}`;
    const up = await sb.storage.from('property-photos').upload(path, f, { contentType: f.type });
    if (up.error) { bad++; continue; }
    await q(`insert into photos (property_id, path) values ($1, $2)`, [pid, path]);
  }
  revalidatePath(`/owner/${pid}`);
  redirect(`/owner/${pid}?${bad ? `photoerr=${bad}` : 'photos=1'}#photos`);
}

export async function submitForReview(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { user } = await requireOwner();
  const p = await mine(pid, user.id);
  if (!p) redirect('/owner');
  const n = await one<{ n: number }>(`select count(*)::int n from units where property_id = $1`, [pid]);
  if (!n?.n) redirect(`/owner/${pid}?error=${encodeURIComponent('Add at least one room with its rent first.')}`);
  await q(`update properties set status = 'submitted', rejection_reason = null where id = $1`, [pid]);
  await q(`insert into audit_log (actor_id, action, entity, entity_id) values ($1, 'owner:submit', 'property', $2)`, [user.id, pid]);
  redirect(`/owner/${pid}?submitted=1`);
}

export async function claimListing(fd: FormData) {
  const m = String(fd.get('link') ?? fd.get('pid') ?? '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  const pid = m?.[0] ?? '';
  const { user } = await requireOwner();
  if (!pid || !(await one(`select 1 from properties where id = $1 and owner_id is null`, [pid]))) redirect(`/owner?claimed=bad`);
  if (okId(pid)) await q(`insert into claims (property_id, user_id, note) values ($1, $2, $3) on conflict do nothing`, [pid, user.id, String(fd.get('note') ?? '').slice(0, 500) || null]);
  redirect('/owner?claimed=1');
}
