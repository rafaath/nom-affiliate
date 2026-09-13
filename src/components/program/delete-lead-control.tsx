'use client';

import { Trash2 } from 'lucide-react';
import { deleteLeadAction } from '@/app/actions/partner';
import { Button } from '@/components/ui/button';

export function DeleteLeadControl({ leadId, restaurantName }: { leadId: string; restaurantName: string }) {
  return (
    <form
      action={deleteLeadAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete the submitted lead for ${restaurantName}? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="leadId" type="hidden" value={leadId} />
      <Button size="sm" type="submit" variant="destructive">
        <Trash2 className="size-3.5" aria-hidden="true" />
        Delete
      </Button>
    </form>
  );
}
