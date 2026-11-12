import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { verifyCode, resendCode } from '../auth-actions';

export const metadata = { title: 'Confirm your email' };

export default async function Verify({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; resent?: string }> }) {
  const { email = '', error, resent } = await searchParams;
  return (
    <AuthCard title="Check your email" lead={email ? `We sent a code to ${email}. Enter it below, or open the link in that email on this phone.` : 'Enter the code from the email we sent you.'}
      error={error} ok={resent ? 'A new code is on its way. It can take a minute.' : undefined}
      foot={<>Wrong email? <Link href="/owner/signup" className="text-accent-deep underline">Start again</Link></>}>
      <form action={verifyCode} className="grid gap-3">
        <label className="label">Email<input name="email" type="email" required defaultValue={email} className="field" /></label>
        <label className="label">Code from the email<input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={10} className="field num text-lg" /></label>
        <button className="btn btn-primary">Confirm email</button>
      </form>
      <form action={resendCode} className="mt-3">
        <input type="hidden" name="email" value={email} />
        <button className="btn btn-quiet text-sm" disabled={!email}>Send a new code</button>
      </form>
    </AuthCard>
  );
}
