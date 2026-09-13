import postgres from 'postgres';
import { SupabaseConfigError } from '@/lib/supabase/env';

export const DATABASE_OPERATION_TIMEOUT_MS = 20_000;

export class DatabaseOperationTimeoutError extends Error {
  readonly code = 'DATABASE_OPERATION_TIMEOUT';

  constructor() {
    super('The database took too long. Refresh and check the latest status before submitting again.');
    this.name = 'DatabaseOperationTimeoutError';
  }
}

export function createDatabaseClient(max = 1) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new SupabaseConfigError('Missing DATABASE_URL for server-side database access.');
  if (!Number.isInteger(max) || max < 1) throw new SupabaseConfigError('DATABASE_POOL_MAX must be a positive integer.');
  return postgres(databaseUrl, {
    max,
    connect_timeout: 5,
    idle_timeout: 5,
    max_lifetime: 60,
    prepare: false,
    ssl: process.env.DATABASE_SSL === 'disable' || databaseUrl.includes('sslmode=disable') ? false : 'require',
    connection: { application_name: 'nom-affiliate' },
  });
}

/**
 * Supavisor remains the shared pool. Each portal operation owns one short-lived
 * client so a frozen/stale socket cannot block the next request, and a deadline
 * can close this operation without interrupting another user's transaction.
 * Never retry writes automatically: a lost COMMIT response is ambiguous.
 */
export async function withDatabaseOperation<T>(
  operation: string,
  work: (sql: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  const sql = createDatabaseClient();
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = sql.begin(async (tx) => {
      // LOCAL settings disappear at COMMIT/ROLLBACK; other apps sharing this
      // Supabase project and transaction pool are not changed.
      await tx`select
        set_config('statement_timeout', '10s', true),
        set_config('lock_timeout', '3s', true),
        set_config('idle_in_transaction_session_timeout', '15s', true)
      `;
      return work(tx);
    });
    return await Promise.race([
      result as Promise<T>,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DatabaseOperationTimeoutError()), DATABASE_OPERATION_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    // Deliberately omit SQL, parameters, credentials, and personal information.
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
    console.error('[database] operation failed', { operation, durationMs: Date.now() - started, code });
    throw error;
  } finally {
    clearTimeout(timer);
    // This client is exclusively owned here. Closing it also rejects any
    // outstanding work after a timeout; the race already observes rejections.
    await sql.end({ timeout: 0 });
    const durationMs = Date.now() - started;
    if (durationMs >= 2_000) console.warn('[database] slow operation', { operation, durationMs });
  }
}
