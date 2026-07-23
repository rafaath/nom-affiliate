import type { ReactNode } from 'react';

type LegalSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export function LegalDocument({
  eyebrow,
  title,
  version,
  effectiveDate,
  introduction,
  sections,
  footer,
}: {
  eyebrow: string;
  title: string;
  version: string;
  effectiveDate: string;
  introduction?: ReactNode;
  sections: readonly LegalSection[];
  footer?: ReactNode;
}) {
  return (
    <main className="marketing-container py-12 lg:py-20">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-plum/20 pb-9">
          <p className="marketing-eyebrow text-success">{eyebrow}</p>
          <h1 className="marketing-title mt-6">{title}</h1>
          <p className="mt-5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Version {version} · Effective {effectiveDate}
          </p>
          {introduction ? <div className="mt-7 text-base leading-8 text-ink-body">{introduction}</div> : null}
        </header>

        <div className="divide-y divide-plum/15">
          {sections.map((section) => (
            <section className="py-8" key={section.title}>
              <h2 className="font-display text-2xl font-bold">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p className="mt-4 text-sm leading-7 text-ink-body" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-4 grid gap-3 pl-5 text-sm leading-7 text-ink-body">
                  {section.bullets.map((bullet) => (
                    <li className="list-disc pl-1" key={bullet}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {footer ? <footer className="border-t border-plum/20 pt-8 text-sm leading-7 text-ink-body">{footer}</footer> : null}
      </article>
    </main>
  );
}

