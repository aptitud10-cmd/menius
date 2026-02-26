import { createLogger } from '@/lib/logger';

const logger = createLogger('retry');

interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  context?: string;
}

const RETRYABLE_STRIPE_CODES = new Set([
  'rate_limit',
  'api_connection_error',
  'api_error',
  'lock_timeout',
]);

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const code = (error as any).code ?? (error as any).type ?? '';
    if (RETRYABLE_STRIPE_CODES.has(code)) return true;
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') return true;
    if (error.message.includes('network') || error.message.includes('timeout')) return true;
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, backoffMs = 500, shouldRetry = isRetryable, context = '' } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt >= maxRetries || !shouldRetry(err)) {
        throw err;
      }

      const delay = backoffMs * Math.pow(2, attempt);
      logger.warn(`Retry ${attempt + 1}/${maxRetries}${context ? ` [${context}]` : ''}`, {
        delay,
        error: err instanceof Error ? err.message : String(err),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
