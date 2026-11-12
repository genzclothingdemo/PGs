import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { logIn } from '../auth-actions';

export const metadata = { title: 'Owner login' };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; email?: string }> }) {
  const { error, next = '/owner', email = '' } = await searchParams;
  return (
    <AuthCard title="Owner login" lead="Manage your PG or flat listings." error={error}
      foot={<>New here? <Link href="/owner/signup" className="text-accent-deep underline">Create an owner account</Link></>}>
      <form action={logIn} className="grid gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="label">Email<input name="email" type="email" required defaultValue={email} autoComplete="email" className="field" /></label>
        <label className="label">Password<input name="password" type="password" required autoComplete="current-password" className="field" /></label>
        <button className="btn btn-primary mt-1">Log in</button>
      </form>
      <Link href={`/owner/forgot${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="btn btn-quiet mt-2 text-sm">Forgot password?</Link>
    </AuthCard>
  );
}
