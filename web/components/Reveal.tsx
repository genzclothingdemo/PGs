'use client';
import { useState } from 'react';
import { revealPhone } from '@/app/p/[id]/actions';

export default function Reveal({ pid, loggedIn }: { pid: string; loggedIn: boolean }) {
  const [r, setR] = useState<{ phone?: string | null; whatsapp?: string | null; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!loggedIn) return <a className="btn w-full" href={`/login?next=/p/${pid}`}>Sign in to see phone number</a>;
  if (r?.phone) {
    const d = r.phone.replace(/\D/g, '').slice(-10);
    return (<div className="grid gap-2"><a className="btn w-full" href={`tel:+91${d}`}>Call {d.slice(0, 5)} {d.slice(5)}</a><a className="btn btn-ghost w-full" target="_blank" href={`https://wa.me/91${d}`}>WhatsApp</a></div>);
  }
  return (<div><button className="btn w-full" disabled={busy} onClick={async () => { setBusy(true); setR(await revealPhone(pid)); setBusy(false); }}>{busy ? 'Loading...' : 'Show phone number'}</button>
    {r && !r.phone && <p className="text-xs text-clay mt-2">{r.error || 'The owner has not listed a phone number.'}</p>}</div>);
}
