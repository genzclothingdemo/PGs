export const STATUS: Record<string, string> = { draft: 'Draft', submitted: 'Waiting for review', in_review: 'In review', changes_requested: 'Changes requested', rejected: 'Not approved', published: 'Live', paused: 'Paused', expired: 'Expired', archived: 'Archived' };

export function StatusTag({ status }: { status: string }) {
  const cls = status === 'published' ? 'tag-ok' : ['changes_requested', 'rejected', 'submitted', 'in_review'].includes(status) ? 'tag-wait' : '';
  return <span className={`tag ${cls}`}>{STATUS[status] ?? status}</span>;
}
