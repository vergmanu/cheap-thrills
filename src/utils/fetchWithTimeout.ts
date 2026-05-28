const DEFAULT_TIMEOUT_MS = 8000;

function linkAbortSignals(
  target: AbortController,
  external?: AbortSignal,
): (() => void) | undefined {
  if (!external) return undefined;

  if (external.aborted) {
    target.abort();
    return undefined;
  }

  const onAbort = () => target.abort();
  external.addEventListener('abort', onAbort);
  return () => external.removeEventListener('abort', onAbort);
}

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const unlink = linkAbortSignals(controller, init?.signal ?? undefined);
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
    unlink?.();
  }
}

export async function fetchJsonWithTimeout<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const response = await fetchWithTimeout(url, init, timeoutMs);

  if (!response.ok) {
    throw new Error('Request failed. Please try again.');
  }

  return response.json() as Promise<T>;
}
