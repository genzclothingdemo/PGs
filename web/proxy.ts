import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdmin } from '@/lib/admin-session';

const OWNER_PUBLIC = ['/owner/login', '/owner/signup', '/owner/verify', '/owner/forgot', '/owner/reset'];

export async function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // Admin: separate credentials from .env, signed cookie
  if (p.startsWith('/admin') && p !== '/admin/login') {
    if (!(await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value))) {
      const url = req.nextUrl.clone(); url.pathname = '/admin/login'; url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Owners: Supabase session (refresh cookie on every owner request)
  let res = NextResponse.next({ request: req });
  if (p.startsWith('/owner') || p.startsWith('/auth')) {
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getUser();
    if (!data.user && p.startsWith('/owner') && !OWNER_PUBLIC.some((x) => p.startsWith(x))) {
      const url = req.nextUrl.clone(); url.pathname = '/owner/login'; url.search = `?next=${encodeURIComponent(p)}`;
      return NextResponse.redirect(url);
    }
  }
  return res;
}

export const config = { matcher: ['/admin/:path*', '/owner/:path*', '/auth/:path*'] };
