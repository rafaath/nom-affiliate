import { getCurrentUser } from '@/lib/supabase/auth';
import { getPartnerLeadAccess } from '@/lib/partner-program/data';
import { partnerAccessStateKey } from '@/lib/partner-program/lead-access';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const headers = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET() {
  try {
    // /api routes are not protected by the page proxy. Verify Google auth here.
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    const access = await getPartnerLeadAccess(user.id);
    return Response.json({ stateKey: partnerAccessStateKey(access) }, { headers });
  } catch {
    return Response.json({ error: 'Temporarily unavailable' }, { status: 503, headers });
  }
}
