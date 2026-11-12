import AuthCard from '@/components/AuthCard';
import { recoverWithCode, setNewPassword } from '../auth-actions';

export const metadata = { title: 'Set a new password' };

export default async function Reset({ searchParams }: { searchParams: Promise<{ email?: string; sent?: string; step?: string; error?: string }> }) {
  const { email = '', sent, step, error } = await searchParams;
  if (step === 'new') return (
    <AuthCard title="Set a new password" error={error}>
      <form action={setNewPassword} className="grid gap-3">
        <label className="label">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" /></label>
        <button className="btn btn-primary">Save password</button>
      </form>
    </AuthCard>
  );
  return (
    <AuthCard title="Enter the reset code" lead={`If ${email || 'that email'} has an account, we sent a code and a link. Enter the code, or open the link on this phone.`}
      error={error} ok={sent ? 'Email sent. It can take a minute.' : undefined}>
      <form action={recoverWithCode} className="grid gap-3">
        <label className="label">Email<input name="email" type="email" required defaultValue={email} className="field" /></label>
        <label className="label">Code from the email<input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={10} className="field num text-lg" /></label>
        <button className="btn btn-primary">Continue</button>
      </form>
    </AuthCard>
  );
}
