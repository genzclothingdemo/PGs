'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { ADMIN_COOKIE } from '@/lib/admin-session';
import { one, q } from '@/lib/db';
import { readListingForm, readUnitForm, LISTING_COLS } from '@/lib/listing-form';

const okId = (id: unknown) => /^[0-9a-f-]{36}$/.test(String(id));
const log = (action: string, entity: string, id: string, detail?: object) => q(`insert into audit_log (action, entity, entity_id, detail) values ($1, $2, $3, $4)`, [action, entity, id, detail ? JSON.stringify(detail) : null]);
const back = (fd: FormData, fallback: string) => { const b = String(fd.get('back') ?? ''); return b.startsWith('/admin') ? b : fallback; };

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

// ---------- listings ----------
const STATUSES = ['draft', 'submitted', 'in_review', 'changes_requested', 'rejected', 'published', 'paused', 'archived'];
export async function setStatus(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id')), status = String(fd.get('status')), note = String(fd.get('note') ?? '').trim().slice(0, 500) || null;
  if (!okId(id) || !STATUSES.includes(status)) redirect(back(fd, '/admin/listings'));
  await q(`update properties set status = $2::listing_status, rejection_reason = case when $2 in ('rejected','changes_requested') then $3 else null end,
    published_at = case when $2 = 'published' then coalesce(published_at, now()) else published_at end,
    verified = case when $2 = 'published' and source = 'owner' and verified = 'unverified' then 'phone_verified'::verify_level else verified end where id = $1`, [id, status, note]);
  await q(`update properties set score = property_score($1) where id = $1`, [id]);
  await log(`listing:${status}`, 'property', id, note ? { note } : undefined);
  revalidatePath('/admin', 'layout');
  redirect(back(fd, '/admin/listings'));
}

export async function bulkStatus(fd: FormData) {
  await requireAdmin();
  const ids = fd.getAll('ids').map(String).filter(okId), status = String(fd.get('status'));
  if (ids.length && STATUSES.includes(status)) {
    await q(`update properties set status = $2::listing_status, published_at = case when $2 = 'published' then coalesce(published_at, now()) else published_at end where id = any($1::uuid[])`, [ids, status]);
    await log(`listing:bulk:${status}`, 'property', ids.join(','));
  }
  revalidatePath('/admin', 'layout');
  redirect(back(fd, '/admin/listings'));
}

export async function saveListing(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const v = await readListingForm(fd);
  const verified = ['unverified', 'phone_verified', 'owner_claimed', 'admin_verified'].includes(String(fd.get('verified'))) ? String(fd.get('verified')) : 'admin_verified';
  const notes = String(fd.get('admin_notes') ?? '').slice(0, 2000) || null;
  if (okId(id)) {
    await q(`update properties set ${LISTING_COLS.map((c, i) => `${c} = $${i + 2}`).join(', ')}, verified = $${LISTING_COLS.length + 2}::verify_level, admin_notes = $${LISTING_COLS.length + 3} where id = $1`,
      [id, ...LISTING_COLS.map((c) => v[c]), verified, notes]);
    await q(`update properties set score = property_score($1) where id = $1`, [id]);
    await log('listing:edit', 'property', id);
    redirect(`/admin/listings/${id}?saved=1`);
  }
  const status = String(fd.get('status')) === 'draft' ? 'draft' : 'published';
  const r = await one<{ id: string }>(`insert into properties (${LISTING_COLS.join(',')}, verified, admin_notes, source, status, published_at)
    values (${LISTING_COLS.map((_, i) => `$${i + 1}`).join(',')}, $${LISTING_COLS.length + 1}::verify_level, $${LISTING_COLS.length + 2}, 'admin', $${LISTING_COLS.length + 3}::listing_status, case when $${LISTING_COLS.length + 3} = 'published' then now() end) returning id`,
    [...LISTING_COLS.map((c) => v[c]), verified, notes, status]);
  await log('listing:create', 'property', r!.id);
  redirect(`/admin/listings/${r!.id}?created=1`);
}

export async function deleteListing(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  if (okId(id) && String(fd.get('confirm')) === 'DELETE') {
    await q(`update properties set status = 'archived' where id = $1`, [id]);
    await log('listing:archive', 'property', id);
  }
  redirect('/admin/listings?archived=1');
}

export async function adminAddUnit(fd: FormData) {
  await requireAdmin();
  const pid = String(fd.get('pid')), u = readUnitForm(fd);
  if (okId(pid) && u) {
    await q(`insert into units (property_id, label, sharing, bhk, rent, deposit, ac, food_included, beds_total, beds_available) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [pid, u.label, u.sharing, u.bhk, u.rent, u.deposit, u.ac, u.food_included, u.beds_total, u.beds_available]);
    await q(`update properties set score = property_score($1) where id = $1`, [pid]);
  }
  revalidatePath(`/admin/listings/${pid}`);
}
export async function adminRemoveUnit(fd: FormData) {
  await requireAdmin();
  const pid = String(fd.get('pid'));
  if (okId(pid)) await q(`delete from units where id = $1 and property_id = $2`, [String(fd.get('uid')), pid]);
  revalidatePath(`/admin/listings/${pid}`);
}

// ---------- photos, claims, reports, reviews ----------
export async function photoDecision(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  if (okId(id)) {
    if (fd.get('ok') === '1') await q(`update photos set approved = true where id = $1`, [id]);
    else await q(`delete from photos where id = $1`, [id]);
  }
  revalidatePath('/admin', 'layout');
  redirect(back(fd, '/admin/moderation'));
}
export async function claimDecision(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id')), ok = fd.get('ok') === '1';
  const c = okId(id) ? await one<{ property_id: string; user_id: string }>(`select property_id, user_id from claims where id = $1`, [id]) : null;
  if (c) {
    await q(`update claims set status = $2 where id = $1`, [id, ok ? 'approved' : 'rejected']);
    if (ok) {
      await q(`update properties set owner_id = $2, verified = 'owner_claimed' where id = $1`, [c.property_id, c.user_id]);
      await q(`insert into user_roles (user_id, role) values ($1, 'owner') on conflict do nothing`, [c.user_id]);
    }
    await log(ok ? 'claim:approve' : 'claim:reject', 'claim', id);
  }
  redirect('/admin/moderation');
}
export async function reportDecision(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id')), status = String(fd.get('status'));
  if (okId(id) && ['resolved', 'dismissed'].includes(status)) await q(`update reports set status = $2 where id = $1`, [id, status]);
  redirect('/admin/moderation');
}

// ---------- leads (CRM) ----------
const LEAD = ['new', 'contacted', 'visit_scheduled', 'converted', 'lost', 'spam'];
export async function updateLead(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get('id'));
  const status = String(fd.get('status'));
  if (id > 0 && LEAD.includes(status)) {
    const follow = String(fd.get('follow_up') ?? '');
    await q(`update leads set status = $2, notes = $3, follow_up = $4, updated_at = now() where id = $1`,
      [id, status, String(fd.get('notes') ?? '').slice(0, 2000) || null, /^\d{4}-\d{2}-\d{2}$/.test(follow) ? follow : null]);
    await log(`lead:${status}`, 'lead', String(id));
  }
  revalidatePath('/admin/leads');
  redirect(back(fd, '/admin/leads'));
}
export async function addLead(fd: FormData) {
  await requireAdmin();
  const pid = String(fd.get('pid') ?? '');
  const phone = String(fd.get('phone') ?? '').replace(/\D/g, '').slice(-10);
  if (phone.length === 10) await q(`insert into leads (property_id, kind, name, phone, message, status, notes) values ($1, 'call', $2, $3, $4, 'new', $5)`,
    [okId(pid) ? pid : null, String(fd.get('name') ?? '').slice(0, 80) || null, phone, String(fd.get('message') ?? '').slice(0, 500) || null, String(fd.get('notes') ?? '').slice(0, 2000) || null]);
  redirect('/admin/leads?added=1');
}

// ---------- owners ----------
export async function setOwnerRole(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  if (okId(id)) {
    if (fd.get('block') === '1') await q(`delete from user_roles where user_id = $1 and role = 'owner'`, [id]);
    else await q(`insert into user_roles (user_id, role) values ($1, 'owner') on conflict do nothing`, [id]);
    await log(fd.get('block') === '1' ? 'owner:block' : 'owner:allow', 'user', id);
  }
  redirect('/admin/owners');
}
export async function recompute() {
  await requireAdmin();
  await q('select recompute_scores()');
  redirect('/admin?recomputed=1');
}
