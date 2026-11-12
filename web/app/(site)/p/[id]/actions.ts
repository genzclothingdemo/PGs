'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { one, q } from '@/lib/db';

async function visitor() {
  const jar = await cookies();
  let v = jar.get('pghub_vid')?.value;
  if (!v || !/^[0-9a-f-]{36}$/.test(v)) { v = randomUUID(); jar.set('pghub_vid', v, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 365, path: '/' }); }
  return v;
}
const okId = (id: string) => /^[0-9a-f-]{36}$/.test(id);
const digits = (s: FormDataEntryValue | null) => String(s ?? '').replace(/\D/g, '').slice(-10);

/** Shows the owner number to anyone, logs the tap as a lead, and limits scraping per visitor. */
export async function revealPhone(pid: string): Promise<{ phone?: string; whatsapp?: string; error?: string }> {
  if (!okId(pid)) return { error: 'Not found' };
  const vid = await visitor();
  const recent = await one<{ n: number }>(`select count(*)::int n from leads where visitor_id = $1 and kind = 'phone_reveal' and created_at > now() - interval '1 hour'`, [vid]);
  if ((recent?.n ?? 0) >= 30) return { error: 'Too many numbers viewed in a short time. Please try again in an hour.' };
  const p = await one<{ phone: string | null; whatsapp: string | null }>(`select phone, whatsapp from properties where id = $1 and status = 'published'`, [pid]);
  if (!p?.phone) return { error: 'The owner has not shared a number yet. Use the call-back request below.' };
  const already = await one(`select 1 from leads where visitor_id = $1 and property_id = $2 and kind = 'phone_reveal'`, [vid, pid]);
  if (!already) await q(`insert into leads (property_id, kind, visitor_id) values ($1, 'phone_reveal', $2)`, [pid, vid]);
  return { phone: p.phone, whatsapp: p.whatsapp ?? p.phone };
}

export async function requestCallback(fd: FormData) {
  const pid = String(fd.get('pid'));
  if (!okId(pid)) redirect('/explore');
  const name = String(fd.get('name') ?? '').trim().slice(0, 80);
  const phone = digits(fd.get('phone'));
  if (!name || phone.length !== 10) redirect(`/p/${pid}?sent=invalid#callback`);
  const vid = await visitor();
  const recent = await one<{ n: number }>(`select count(*)::int n from leads where visitor_id = $1 and kind = 'callback' and created_at > now() - interval '1 day'`, [vid]);
  if ((recent?.n ?? 0) >= 10) redirect(`/p/${pid}?sent=limit#callback`);
  await q(`insert into leads (property_id, kind, visitor_id, name, phone, message, preferred_time) values ($1, 'callback', $2, $3, $4, $5, $6)`,
    [pid, vid, name, phone, String(fd.get('message') ?? '').slice(0, 500) || null, String(fd.get('when') ?? '').slice(0, 40) || null]);
  redirect(`/p/${pid}?sent=callback#callback`);
}

export async function reportListing(fd: FormData) {
  const pid = String(fd.get('pid'));
  if (!okId(pid)) redirect('/explore');
  const reason = String(fd.get('reason'));
  if (!['wrong_number', 'full', 'closed', 'fake', 'wrong_info', 'other'].includes(reason)) redirect(`/p/${pid}`);
  const vid = await visitor();
  await q(`insert into reports (property_id, visitor_id, reason, detail) values ($1, $2, $3, $4)`, [pid, vid, reason, String(fd.get('detail') ?? '').slice(0, 500) || null]);
  redirect(`/p/${pid}?sent=report#report`);
}
