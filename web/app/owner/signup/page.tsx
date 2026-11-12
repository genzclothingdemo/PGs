import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { signUp } from '../auth-actions';

export const metadata = { title: 'Create an owner account' };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthCard title="Create an owner account" lead="For PG, hostel and flat owners. Free. We email you a link to confirm your address." error={error}
      foot={<>Already have an account? <Link href="/owner/login" className="text-accent-deep underline">Log in</Link></>}>
      <form action={signUp} className="grid gap-3">
        <label className="label">Your name<input name="name" required maxLength={80} autoComplete="name" className="field" /></label>
        <label className="label">Mobile number<input name="phone" required inputMode="numeric" autoComplete="tel" className="field" placeholder="10 digits" /></label>
        <label className="label">Email<input name="email" type="email" required autoComplete="email" className="field" /></label>
        <label className="label">Password<input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" /><span className="text-xs font-normal text-muted">At least 8 characters.</span></label>
        <button className="btn btn-primary mt-1">Create account</button>
      </form>
    </AuthCard>
  );
}
