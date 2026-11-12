import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard';
  if (code) {
    const sb = await supabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/dashboard', url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=Link%20expired%20or%20invalid', url.origin));
}
