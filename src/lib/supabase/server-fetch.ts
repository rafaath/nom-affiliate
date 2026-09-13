/** Abort upstream I/O rather than merely racing a still-running request. */
export const serverAuthFetch: typeof fetch = (input, init) => {
  const inherited = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const timeout = AbortSignal.timeout(8_000);
  return fetch(input, {
    ...init,
    signal: inherited ? AbortSignal.any([inherited, timeout]) : timeout,
  });
};
