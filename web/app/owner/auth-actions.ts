'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import { q } from '@/lib/db';

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3100';
  return `${h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')}://${host}`;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const enc = encodeURIComponent;
const safeNext = (n: string) => (n.startsWith('/owner') ? n : '/owner');

export async function signUp(fd: FormData) {
  const email = s(fd, 'email').toLowerCase(), password = s(fd, 'password'), name = s(fd, 'name').slice(0, 80), phone = s(fd, 'phone').replace(/\D/g, '').slice(-10);
  if (password.length < 8) redirect(`/owner/signup?error=${enc('Use at least 8 characters for the password.')}`);
  if (phone.length !== 10) redirect(`/owner/signup?error=${enc('Enter a 10-digit mobile number.')}`);
  const sb = await supabase();
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, phone }, emailRedirectTo: `${await origin()}/auth/callback?next=/owner` } });
  if (error) redirect(`/owner/signup?error=${enc(error.message)}`);
  if (data.user) await q(`update profiles set full_name = $2, phone = $3 where id = $1`, [data.user.id, name, phone]);
  redirect(`/owner/verify?email=${enc(email)}`);
}

export async function verifyCode(fd: FormData) {
  const email = s(fd, 'email').toLowerCase(), token = s(fd, 'code').replace(/\s/g, '');
  const sb = await supabase();
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) {
    // a code from a login link email also works
    const r2 = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (r2.error) redirect(`/owner/verify?email=${enc(email)}&error=${enc('That code is wrong or has expired. Send a new one.')}`);
  }
  redirect('/owner');
}

export async function resendCode(fd: FormData) {
  const email = s(fd, 'email').toLowerCase();
  const sb = await supabase();
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${await origin()}/auth/callback?next=/owner` } });
  redirect(`/owner/verify?email=${enc(email)}&${error ? `error=${enc(error.message)}` : 'resent=1'}`);
}

export async function logIn(fd: FormData) {
  const email = s(fd, 'email').toLowerCase(), password = s(fd, 'password'), next = safeNext(s(fd, 'next'));
  const sb = await supabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) redirect(`/owner/verify?email=${enc(email)}`);
    redirect(`/owner/login?error=${enc('Email or password is wrong.')}&email=${enc(email)}`);
  }
  redirect(next);
}

export async function forgot(fd: FormData) {
  const email = s(fd, 'email').toLowerCase();
  const sb = await supabase();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?next=/owner/reset` });
  // same answer whether or not the email exists
  redirect(`/owner/reset?email=${enc(email)}&sent=1`);
}

export async function recoverWithCode(fd: FormData) {
  const email = s(fd, 'email').toLowerCase(), token = s(fd, 'code').replace(/\s/g, '');
  const sb = await supabase();
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) redirect(`/owner/reset?email=${enc(email)}&error=${enc('That code is wrong or has expired.')}`);
  redirect('/owner/reset?step=new');
}

export async function setNewPassword(fd: FormData) {
  const password = s(fd, 'password');
  if (password.length < 8) redirect(`/owner/reset?step=new&error=${enc('Use at least 8 characters.')}`);
  const sb = await supabase();
  const { error } = await sb.auth.updateUser({ password });
  if (error) redirect(`/owner/reset?step=new&error=${enc(error.message)}`);
  redirect('/owner?done=password');
}

export async function logOut() {
  const sb = await supabase();
  await sb.auth.signOut();
  redirect('/');
}
