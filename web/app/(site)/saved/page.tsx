import type { Metadata } from 'next';
import SavedList from './SavedList';
export const metadata: Metadata = { title: 'Saved stays' };

export default function Saved() {
  return (
    <div className="wrap py-5 md:py-8">
      <h1 className="text-2xl md:text-3xl">Saved stays</h1>
      <p className="mt-1 text-sm text-muted">Saved on this phone. No account needed.</p>
      <SavedList />
    </div>
  );
}
