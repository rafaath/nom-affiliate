export function PortalLoading() {
  return (
    <div className="grid gap-4 p-6" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Loading the latest account details…</p>
      <div className="h-10 w-2/3 animate-pulse rounded bg-muted" aria-hidden="true" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
    </div>
  );
}
