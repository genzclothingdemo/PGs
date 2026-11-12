import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SB_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

/** Supabase client bound to the request cookies. Used only for owner accounts (auth + photo upload). */
export async function supabase() {
  const jar = await cookies();
  return createServerClient(SB_URL, SB_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* server component: proxy refreshes */ } },
    },
  });
}

/** The signed-in owner (email verified), or a redirect to the owner login. */
export async function requireOwner(next = '/owner') {
  const sb = await supabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect(`/owner/login?next=${encodeURIComponent(next)}`);
  if (!data.user.email_confirmed_at) redirect(`/owner/verify?email=${encodeURIComponent(data.user.email ?? '')}`);
  return { sb, user: data.user };
}
