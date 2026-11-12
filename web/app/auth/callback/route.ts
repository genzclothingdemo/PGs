import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

// Email links (confirm sign-up, reset password) land here.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') ?? '/owner';
  const dest = next.startsWith('/owner') ? next : '/owner';
  const sb = await supabase();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as 'signup' | 'recovery' | 'email' | null;
  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  if (ok) return NextResponse.redirect(new URL(type === 'recovery' || dest === '/owner/reset' ? '/owner/reset?step=new' : dest, url.origin));
  return NextResponse.redirect(new URL('/owner/login?error=This%20link%20has%20expired.%20Log%20in%20or%20ask%20for%20a%20new%20code.', url.origin));
}
