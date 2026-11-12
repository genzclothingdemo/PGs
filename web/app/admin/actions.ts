'use server';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/supabase/server';

export async function moderate(fd: FormData) {
  const { sb } = await session();
  await sb.rpc('moderate_property', { pid: String(fd.get('id')), act: String(fd.get('act')), why: String(fd.get('why') || '') || null });
  revalidatePath('/admin');
}
export async function claimDecision(fd: FormData) {
  const { sb } = await session();
  await sb.rpc('decide_claim', { cid: String(fd.get('id')), ok: fd.get('ok') === '1' });
  revalidatePath('/admin');
}
export async function reviewDecision(fd: FormData) {
  const { sb } = await session();
  await sb.rpc('decide_review', { rid: String(fd.get('id')), ok: fd.get('ok') === '1' });
  revalidatePath('/admin');
}
export async function reportDecision(fd: FormData) {
  const { sb } = await session();
  await sb.from('reports').update({ status: String(fd.get('status')) }).eq('id', String(fd.get('id')));
  revalidatePath('/admin');
}
export async function photoDecision(fd: FormData) {
  const { sb } = await session();
  if (fd.get('ok') === '1') await sb.from('photos').update({ approved: true }).eq('id', String(fd.get('id')));
  else await sb.from('photos').delete().eq('id', String(fd.get('id')));
  revalidatePath('/admin');
}
export async function setRole(fd: FormData) {
  const { sb } = await session();
  await sb.rpc('set_user_role', { uid: String(fd.get('uid')), r: String(fd.get('role')), grant_it: fd.get('grant') === '1' });
  revalidatePath('/admin/users');
}
export async function setVerified(fd: FormData) {
  const { sb } = await session();
  await sb.from('properties').update({ verified: String(fd.get('level')) }).eq('id', String(fd.get('id')));
  await sb.rpc('recompute_scores');
  revalidatePath('/admin');
}
export async function recompute() {
  const { sb } = await session();
  await sb.rpc('recompute_scores');
  revalidatePath('/admin');
}
