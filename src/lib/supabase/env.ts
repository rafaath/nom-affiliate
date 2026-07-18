import { z } from 'zod';

const authSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(20),
});

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

function formatIssue(path: string, message: string) {
  return `${path}: ${message}`;
}

export function readSupabaseAuthEnv() {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  };
}

export function readSupabasePublicConfig() {
  const parsed = authSchema.safeParse(readSupabaseAuthEnv());

  if (!parsed.success) {
    throw new SupabaseConfigError(
      `Missing or invalid Supabase auth configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local. ${parsed.error.issues
        .map((issue) => formatIssue(issue.path.join('.'), issue.message))
        .join('; ')}`
    );
  }

  return {
    url: parsed.data.url,
    anonKey: parsed.data.anonKey,
  };
}

export function isSupabaseConfigError(error: unknown): error is SupabaseConfigError {
  return error instanceof SupabaseConfigError;
}
