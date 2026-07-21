import Image from 'next/image';
import Link from 'next/link';

export function MarketingFooter({ isSignedIn = false }: { isSignedIn?: boolean }) {
  return (
    <footer className="bg-coral text-white">
      <div className="marketing-container grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 font-display text-2xl font-bold">
            <Image className="size-10" src="/nomnom-mark.svg" alt="" width={40} height={40} />
            Nom Partner Program
          </Link>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/75">Find interested restaurants. Help them grow. Earn with Nom.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
          {isSignedIn ? (
            <Link href="/partner">Partner portal</Link>
          ) : (
            <>
              <Link href="/apply">Apply</Link>
              <Link href="/login">Partner login</Link>
            </>
          )}
          <Link href="/#partner-terms">Program terms</Link>
        </nav>
      </div>
      <div className="border-t border-white/20">
        <div className="marketing-container py-5 font-mono text-xs text-white/65">© {new Date().getFullYear()} Nom Ventures LLP</div>
      </div>
    </footer>
  );
}
