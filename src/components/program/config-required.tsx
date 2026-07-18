import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ConfigRequired({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-2xl border-destructive/40">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" />
          </div>
          <CardTitle>Runtime configuration required</CardTitle>
          <CardDescription>
            The partner program fails loudly when database configuration is missing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="mt-4 text-sm">
            Copy <code className="rounded bg-muted px-1.5 py-0.5">.env.example</code> to{' '}
            <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code> and fill in the
            database and Supabase Auth values.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
