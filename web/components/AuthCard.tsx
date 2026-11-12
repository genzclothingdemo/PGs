import Link from 'next/link';

export default function AuthCard({ title, lead, error, ok, children, foot }: { title: string; lead?: string; error?: string; ok?: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="wrap flex h-14 items-center"><Link href="/" className="font-display text-xl font-bold">PGhub</Link></header>
      <main className="wrap grid place-items-start py-6 md:place-items-center md:py-16">
        <div className="card w-full max-w-md p-5 md:p-7">
          <h1 className="text-2xl">{title}</h1>
          {lead && <p className="mt-1 text-sm text-ink-2">{lead}</p>}
          {error && <p className="notice notice-warn mt-4" role="alert">{error}</p>}
          {ok && <p className="notice mt-4" role="status">{ok}</p>}
          <div className="mt-5">{children}</div>
          {foot && <div className="mt-5 border-t border-rule pt-4 text-sm text-ink-2">{foot}</div>}
        </div>
      </main>
    </div>
  );
}
