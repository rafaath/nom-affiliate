'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function AnchoredDetails({
  anchorId,
  className,
  children,
}: {
  anchorId: string;
  className?: string;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openForAnchor = () => {
      if (window.location.hash === `#${anchorId}` && detailsRef.current) {
        detailsRef.current.open = true;
      }
    };

    openForAnchor();
    window.addEventListener('hashchange', openForAnchor);
    return () => window.removeEventListener('hashchange', openForAnchor);
  }, [anchorId]);

  return <details className={className} ref={detailsRef}>{children}</details>;
}
