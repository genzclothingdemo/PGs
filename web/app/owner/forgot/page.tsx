import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { forgot } from '../auth-actions';

export const metadata = { title: 'Reset your password' };

export default async function Forgot({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = '' } = await searchParams;
  return (
    <AuthCard title="Reset your password" lead="Enter your account email. We email you a link to set a new password."
      foot={<Link href="/owner/login" className="text-accent-deep underline">Back to login</Link>}>
      <form action={forgot} className="grid gap-3">
        <label className="label">Email<input name="email" type="email" required defaultValue={email} autoComplete="email" className="field" /></label>
        <button className="btn btn-primary">Send reset link</button>
      </form>
    </AuthCard>
  );
}
