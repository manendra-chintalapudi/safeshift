// ============================================================================
// fetchWithRetry — HTTP client with retry, timeout, and in-memory cache
// ============================================================================

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Fetch with retry, timeout, and optional caching
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    retries = 2,
    retryDelay = 1000,
    timeoutMs = 10000,
    cacheTtlMs,
    ...fetchOptions
  } = options;

  // Check cache
  if (cacheTtlMs) {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as T;

      // Cache result
      if (cacheTtlMs) {
        cache.set(url, { data, expiresAt: Date.now() + cacheTtlMs });
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/**
 * Clear the in-memory cache
 */
export function clearCache(): void {
  cache.clear();
}
