'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto grid max-w-xl gap-4 px-6 py-16" role="alert">
      <h1 className="font-display text-2xl font-bold">We couldn’t load the latest details</h1>
      <p className="text-muted-foreground">The service may be temporarily busy. If you just submitted a form, check its latest status before submitting again.</p>
      <Button className="w-fit" onClick={reset}>Try again</Button>
    </div>
  );
}
