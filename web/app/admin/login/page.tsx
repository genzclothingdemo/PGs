import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import { ADMIN_COOKIE, safeEqual, signAdmin } from '@/lib/admin-session';
import { q } from '@/lib/db';

export const metadata = { title: 'Admin login', robots: { index: false } };

async function login(fd: FormData) {
  'use server';
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  const okEmail = safeEqual(email, (process.env.ADMIN_EMAIL ?? '').toLowerCase());
  const okPass = !!process.env.ADMIN_PASSWORD && safeEqual(password, process.env.ADMIN_PASSWORD);
  // slow down guessing
  await new Promise((r) => setTimeout(r, 400));
  if (!okEmail || !okPass) {
    await q(`insert into audit_log (action, entity, detail) values ('admin:login_failed', 'admin', $1)`, [JSON.stringify({ email })]);
    redirect('/admin/login?error=1');
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await signAdmin(12), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 12 * 3600 });
  await q(`insert into audit_log (action, entity) values ('admin:login', 'admin')`);
  redirect('/admin');
}

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthCard title="Admin" lead="PGhub team only." error={error ? 'Email or password is wrong.' : undefined}>
      <form action={login} className="grid gap-3">
        <label className="label">Admin email<input name="email" type="email" required autoComplete="username" className="field" /></label>
        <label className="label">Password<input name="password" type="password" required autoComplete="current-password" className="field" /></label>
        <button className="btn btn-primary mt-1">Log in</button>
      </form>
    </AuthCard>
  );
}
