'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={props.disabled || pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
