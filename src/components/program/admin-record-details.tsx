import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AdminRecordDetail = {
  label: string;
  value: ReactNode;
  wide?: boolean;
};

export function AdminRecordDetails({
  summary,
  items,
}: {
  summary: string;
  items: readonly AdminRecordDetail[];
}) {
  return (
    <details className="mt-4 rounded-xl border bg-muted/20 p-4">
      <summary className="cursor-pointer font-semibold text-plum">{summary}</summary>
      <dl className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div className={cn('min-w-0', item.wide && 'sm:col-span-2 xl:col-span-3')} key={item.label}>
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
              {hasDisplayValue(item.value) ? item.value : <span className="text-muted-foreground">Not provided</span>}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function hasDisplayValue(value: ReactNode) {
  return value !== null && value !== undefined && value !== '';
}
