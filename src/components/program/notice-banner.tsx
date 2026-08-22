import { CircleCheck } from 'lucide-react';

export function NoticeBanner({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft p-4 text-sm text-foreground" role="status">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
