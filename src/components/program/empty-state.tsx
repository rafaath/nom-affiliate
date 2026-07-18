import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionHref && actionLabel ? (
        <CardContent>
          <Button asChild>
            <Link href={actionHref as never}>
              {actionLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
