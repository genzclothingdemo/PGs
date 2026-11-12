'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { session } from '@/lib/supabase/server';

export async function revealPhone(pid: string): Promise<{ phone?: string | null; whatsapp?: string | null; error?: string }> {
  const { sb, user } = await session();
  if (!user) return { error: 'login' };
  const { data, error } = await sb.rpc('reveal_phone', { pid });
  if (error) return { error: error.message };
  const r = Array.isArray(data) ? data[0] : data;
  return { phone: r?.phone ?? null, whatsapp: r?.whatsapp ?? null };
}
export async function toggleShortlist(pid: string) {
  const { sb, user } = await session();
  if (!user) redirect(`/login?next=/p/${pid}`);
  const { data } = await sb.from('shortlists').select('property_id').eq('property_id', pid).eq('user_id', user.id).maybeSingle();
  if (data) await sb.from('shortlists').delete().eq('property_id', pid).eq('user_id', user.id);
  else await sb.from('shortlists').insert({ property_id: pid, user_id: user.id });
  revalidatePath(`/p/${pid}`); revalidatePath('/shortlist');
}
export async function report(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb, user } = await session();
  if (!user) redirect(`/login?next=/p/${pid}`);
  await sb.from('reports').insert({ property_id: pid, user_id: user.id, reason: String(fd.get('reason')), detail: String(fd.get('detail') || '').slice(0, 500) });
  redirect(`/p/${pid}?done=report`);
}
export async function review(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb, user } = await session();
  if (!user) redirect(`/login?next=/p/${pid}`);
  const n = (k: string) => { const v = Number(fd.get(k)); return v >= 1 && v <= 5 ? v : null; };
  const { error } = await sb.from('reviews').insert({ property_id: pid, user_id: user.id, rating_overall: n('overall') ?? 3, rating_food: n('food'), rating_clean: n('clean'), rating_safety: n('safety'), rating_owner: n('owner'), body: String(fd.get('body') || '').slice(0, 1500) });
  redirect(`/p/${pid}?done=${error ? 'reviewerr' : 'review'}`);
}
export async function claim(fd: FormData) {
  const pid = String(fd.get('pid'));
  const { sb, user } = await session();
  if (!user) redirect(`/login?next=/p/${pid}`);
  await sb.from('claims').insert({ property_id: pid, user_id: user.id, note: String(fd.get('note') || '').slice(0, 500) });
  redirect(`/p/${pid}?done=claim`);
}
