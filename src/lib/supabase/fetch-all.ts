/**
 * Reads every row of a PostgREST query page by page with `.range()`.
 *
 * Supabase caps a single response at its max-rows setting (1000 by default),
 * silently truncating larger result sets. The query passed in must have a
 * deterministic order (e.g. created_at + id) so pages do not overlap.
 *
 * Assumes the project's max-rows is >= `pageSize`; a short page ends the loop.
 */

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export interface FetchAllResult<T> {
  rows: T[];
  /** True when `maxRows` was reached and more rows may exist. */
  truncated: boolean;
  error: string | null;
}

export const DEFAULT_PAGE_SIZE = 1000;
export const DEFAULT_MAX_ROWS = 50_000;

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<FetchAllResult<T>> {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS;
  const rows: T[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize, maxRows) - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) return { rows, truncated: false, error: error.message };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: true, error: null };
}
