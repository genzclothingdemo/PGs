import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { verifyCode, resendCode } from '../auth-actions';

export const metadata = { title: 'Confirm your email' };

export default async function Verify({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; resent?: string }> }) {
  const { email = '', error, resent } = await searchParams;
  return (
    <AuthCard title="Check your email" error={error} ok={resent ? 'We sent the email again. It can take a few minutes.' : undefined}
      foot={<>Wrong email? <Link href="/owner/signup" className="text-accent-deep underline">Start again</Link>. Already confirmed? <Link href="/owner/login" className="text-accent-deep underline">Log in</Link></>}>
      <ol className="grid gap-3 text-sm text-ink-2">
        <li><b className="text-ink">1.</b> Open the email we sent{email ? <> to <b className="text-ink">{email}</b></> : ''}. Check spam too.</li>
        <li><b className="text-ink">2.</b> Tap the confirm link <b className="text-ink">on this same phone or browser</b>.</li>
        <li><b className="text-ink">3.</b> Your owner dashboard opens. You are done.</li>
      </ol>
      <form action={resendCode} className="mt-5">
        <input type="hidden" name="email" value={email} />
        <button className="btn w-full" disabled={!email}>Send the email again</button>
      </form>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-2">The email has a code instead</summary>
        <form action={verifyCode} className="mt-3 grid gap-3">
          <input type="hidden" name="email" value={email} />
          <label className="label">Code from the email<input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={10} className="field num text-lg" /></label>
          <button className="btn btn-primary">Confirm</button>
        </form>
      </details>
    </AuthCard>
  );
}
