export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-7 max-w-3xl">
      <p className="marketing-eyebrow text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">{title}</h1>
      {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
    </header>
  );
}
