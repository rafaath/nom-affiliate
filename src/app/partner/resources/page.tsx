import { ConfigRequired } from '@/components/program/config-required';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defaultPartnerResources } from '@/lib/partner-program/resources';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerResourcesPage() {
  try {
    await requireUser('/partner/resources');
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {defaultPartnerResources.map((resource) => (
          <Card key={resource.title}>
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
              <CardDescription>{resource.category} · {resource.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{resource.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
