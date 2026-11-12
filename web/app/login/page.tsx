import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

async function send(fd: FormData) {
  'use server';
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const next = String(fd.get('next') || '/dashboard');
  const sb = await supabase();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100';
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  redirect(error ? `/login?error=${encodeURIComponent(error.message)}` : `/login?sent=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}
async function verify(fd: FormData) {
  'use server';
  const email = String(fd.get('email')); const next = String(fd.get('next') || '/dashboard');
  const sb = await supabase();
  const { error } = await sb.auth.verifyOtp({ email, token: String(fd.get('code') || '').trim(), type: 'email' });
  redirect(error ? `/login?sent=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}` : next);
}

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; next?: string }> }) {
  const { sent, error, next = '/dashboard' } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="text-muted mt-2 text-sm">Enter your email. We send a sign-in link and a 6-digit code. No password to remember.</p>
      {error && <p className="mt-4 text-sm bg-[#f6e3dc] text-clay rounded p-3">{error}</p>}
      {!sent ? (
        <form action={send} className="mt-6 grid gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="text-sm">Email<input name="email" type="email" required autoFocus className="field mt-1" placeholder="you@example.com" /></label>
          <button className="btn">Send sign-in link</button>
        </form>
      ) : (
        <div className="mt-6 grid gap-4">
          <p className="text-sm bg-card border border-line rounded p-3">We sent a link to <b>{sent}</b>. Open it on this device, or enter the code from the email below.</p>
          <form action={verify} className="grid gap-3">
            <input type="hidden" name="email" value={sent} /><input type="hidden" name="next" value={next} />
            <label className="text-sm">6-digit code<input name="code" inputMode="numeric" maxLength={8} className="field mt-1 tracking-widest" /></label>
            <button className="btn">Verify and continue</button>
          </form>
        </div>
      )}
    </div>
  );
}
