'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import { readSaved } from '@/components/SaveButton';
import type { Card } from '@/lib/format';
import { loadCards } from './actions';

export default function SavedList() {
  const [rows, setRows] = useState<Card[] | null>(null);
  useEffect(() => { const ids = readSaved(); (ids.length ? loadCards(ids) : Promise.resolve([])).then(setRows).catch(() => setRows([])); }, []);
  if (rows === null) return <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="card h-40 animate-pulse bg-paper-2" />)}</div>;
  if (!rows.length) return (
    <div className="card mt-5 p-6 text-center">
      <p className="font-medium">Nothing saved yet.</p>
      <p className="mt-1 text-sm text-muted">Tap the bookmark on any stay to keep it here while you compare.</p>
      <Link href="/explore" className="btn btn-primary mt-4">Explore stays</Link>
    </div>
  );
  return <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((c) => <ListingCard key={c.id} c={c} />)}</div>;
}
