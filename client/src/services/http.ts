export class HttpTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HttpTimeoutError';
  }
}

const isAbortError = (error: unknown) => {
  const name = (error as { name?: unknown } | null)?.name;
  return name === 'AbortError' || name === 'TimeoutError';
};

const mergeSignals = (signals: (AbortSignal | null | undefined)[]): AbortSignal | undefined => {
  const activeSignals = signals.filter((s): s is AbortSignal => Boolean(s));
  if (activeSignals.length === 0) return undefined;
  if (activeSignals.length === 1) return activeSignals[0];

  const controller = new AbortController();
  const onAbort = () => controller.abort();

  for (const signal of activeSignals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
};

export const fetchJsonWithTimeout = async <T>(
  url: string,
  init?: RequestInit,
  timeoutMs: number = 8000
): Promise<{ data: T; count: number | null }> => {
  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    const signal = mergeSignals([init?.signal, timeoutController.signal]);
    const response = await fetch(url, { ...init, signal });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as T;

    // Parse Content-Range header if present (e.g. "0-24/357")
    const contentRange = response.headers.get('Content-Range');
    let count: number | null = null;
    if (contentRange) {
      const parts = contentRange.split('/');
      if (parts.length === 2 && parts[1] !== '*') {
        count = parseInt(parts[1], 10);
      }
    }

    return { data, count };
  } catch (error) {
    if (isAbortError(error)) {
      throw new HttpTimeoutError(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};
