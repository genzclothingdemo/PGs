'use client';
import { useEffect, useState } from 'react';

const KEY = 'pghub:saved';
export function readSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

/** Shortlist without an account: kept in this browser only. */
export default function SaveButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(readSaved().includes(id)); }, [id]);
  const toggle = () => {
    const cur = readSaved();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 60);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setOn(next.includes(id));
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? 'Remove from saved' : 'Save'}
      className={compact ? 'relative z-10 -m-2 grid h-11 w-11 place-items-center rounded-full text-accent-deep' : 'btn w-full'}>
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
      {!compact && (on ? 'Saved' : 'Save to shortlist')}
    </button>
  );
}
