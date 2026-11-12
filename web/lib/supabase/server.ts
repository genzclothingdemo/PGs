import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabase() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* called from a Server Component: proxy refreshes the session */ } },
    },
  });
}

export type Role = 'seeker' | 'owner' | 'moderator' | 'admin' | 'super_admin';
export async function session() {
  const sb = await supabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { sb, user: null, roles: [] as Role[], staff: false, admin: false };
  const { data: r } = await sb.from('user_roles').select('role').eq('user_id', data.user.id);
  const roles = (r ?? []).map((x) => x.role as Role);
  return { sb, user: data.user, roles, staff: roles.some((x) => ['moderator', 'admin', 'super_admin'].includes(x)), admin: roles.some((x) => ['admin', 'super_admin'].includes(x)) };
}
