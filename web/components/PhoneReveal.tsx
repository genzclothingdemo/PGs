'use client';
import { useState } from 'react';
import { revealPhone } from '@/app/(site)/p/[id]/actions';

export default function PhoneReveal({ pid, hasPhone }: { pid: string; hasPhone: boolean }) {
  const [r, setR] = useState<{ phone?: string; whatsapp?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!hasPhone) return <a href="#callback" className="btn btn-primary w-full">Request a call back</a>;
  if (r?.phone) {
    const d = r.phone.slice(-10), w = (r.whatsapp ?? r.phone).slice(-10);
    return (
      <div className="grid gap-2">
        <a className="btn btn-primary w-full" href={`tel:+91${d}`}>Call <span className="num">{d.slice(0, 5)} {d.slice(5)}</span></a>
        <a className="btn w-full" href={`https://wa.me/91${w}`} target="_blank" rel="noopener">Message on WhatsApp</a>
      </div>
    );
  }
  return (
    <div>
      <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={async () => { setBusy(true); setR(await revealPhone(pid)); setBusy(false); }}>
        {busy ? 'Getting the number' : 'Show phone number'}
      </button>
      {r?.error && <p className="mt-2 text-sm text-warn-ink" role="status">{r.error}</p>}
    </div>
  );
}
