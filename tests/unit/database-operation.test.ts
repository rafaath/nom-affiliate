import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clients: Array<{ begin: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; tx: ReturnType<typeof vi.fn> }> = [];
const factory = vi.fn(() => {
  const tx = vi.fn(async () => []);
  const client = { tx, begin: vi.fn(async (work: (tx: unknown) => unknown) => work(tx)), end: vi.fn(async () => {}) };
  clients.push(client);
  return client;
});

beforeEach(() => {
  vi.resetModules();
  vi.doMock('postgres', () => ({ default: factory }));
  vi.stubEnv('DATABASE_URL', 'postgresql://test:never-log-this@localhost/test?sslmode=disable');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  clients.length = 0;
  factory.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.doUnmock('postgres');
  vi.resetModules();
});

describe('bounded database operations', () => {
  it('uses transaction-local limits, disables prepared statements, and closes after commit', async () => {
    const { withDatabaseOperation } = await import('@/lib/db/operation');
    const result = await withDatabaseOperation('test.read', async () => 'saved');
    expect(result).toBe('saved');
    expect(factory).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ max: 1, prepare: false, connect_timeout: 5 }));
    const settings = clients[0].tx.mock.calls[0][0] as unknown as string[];
    expect(settings.join('')).toContain("set_config('statement_timeout', '10s', true)");
    expect(settings.join('')).toContain("set_config('lock_timeout', '3s', true)");
    expect(clients[0].end).toHaveBeenCalledWith({ timeout: 0 });
  });

  it('closes a stalled operation at the deadline without retrying or closing another client', async () => {
    vi.useFakeTimers();
    const { withDatabaseOperation, DATABASE_OPERATION_TIMEOUT_MS } = await import('@/lib/db/operation');
    const write = vi.fn(() => new Promise<never>(() => {}));
    const stalled = withDatabaseOperation('test.write', write);
    const rejection = expect(stalled).rejects.toMatchObject({ code: 'DATABASE_OPERATION_TIMEOUT' });
    let finishOther!: (value: string) => void;
    const other = withDatabaseOperation('test.other', () => new Promise<string>((resolve) => { finishOther = resolve; }));
    await vi.advanceTimersByTimeAsync(DATABASE_OPERATION_TIMEOUT_MS - 1);
    finishOther('other saved');
    await expect(other).resolves.toBe('other saved');
    const otherCloses = clients[1].end.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(write).toHaveBeenCalledTimes(1);
    expect(clients[0].end).toHaveBeenCalledTimes(1);
    expect(clients[1].end).toHaveBeenCalledTimes(otherCloses);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('never-log-this');
  });

  it('propagates errors, closes the client, and never retries a write', async () => {
    const { withDatabaseOperation } = await import('@/lib/db/operation');
    const error = Object.assign(new Error('sensitive SQL details'), { code: '55P03' });
    const work = vi.fn(async () => { throw error; });
    await expect(withDatabaseOperation('test.failure', work)).rejects.toBe(error);
    expect(work).toHaveBeenCalledTimes(1);
    expect(clients[0].end).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('sensitive SQL');
  });
});
