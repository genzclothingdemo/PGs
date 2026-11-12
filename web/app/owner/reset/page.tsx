import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { recoverWithCode, setNewPassword } from '../auth-actions';

export const metadata = { title: 'Reset your password' };

export default async function Reset({ searchParams }: { searchParams: Promise<{ email?: string; sent?: string; step?: string; error?: string }> }) {
  const { email = '', sent, step, error } = await searchParams;
  if (step === 'new') return (
    <AuthCard title="Set a new password" error={error}>
      <form action={setNewPassword} className="grid gap-3">
        <label className="label">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" /><span className="text-xs font-normal text-muted">At least 8 characters.</span></label>
        <button className="btn btn-primary">Save password</button>
      </form>
    </AuthCard>
  );
  return (
    <AuthCard title="Check your email" error={error} ok={sent ? 'If this email has an owner account, the reset email is on its way. It can take a few minutes.' : undefined}
      foot={<Link href="/owner/login" className="text-accent-deep underline">Back to login</Link>}>
      <ol className="grid gap-3 text-sm text-ink-2">
        <li><b className="text-ink">1.</b> Open the reset email{email ? <> sent to <b className="text-ink">{email}</b></> : ''}. Check spam too.</li>
        <li><b className="text-ink">2.</b> Tap the link <b className="text-ink">on this same phone or browser</b>.</li>
        <li><b className="text-ink">3.</b> Choose a new password.</li>
      </ol>
      <Link href={`/owner/forgot${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="btn mt-5 w-full">Send the email again</Link>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-2">The email has a code instead</summary>
        <form action={recoverWithCode} className="mt-3 grid gap-3">
          <input type="hidden" name="email" value={email} />
          <label className="label">Code from the email<input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={10} className="field num text-lg" /></label>
          <button className="btn btn-primary">Continue</button>
        </form>
      </details>
    </AuthCard>
  );
}
