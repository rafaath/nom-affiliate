import { AlertTriangle } from 'lucide-react';

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
