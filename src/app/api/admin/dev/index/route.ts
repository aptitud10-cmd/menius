export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dev-index');

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';
const GITHUB_BRANCH = 'main';

const INCLUDE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.sql', '.md', '.json'];
const EXCLUDE_PATHS = [
  'node_modules', '.next', '.git', 'dist', 'build',
  'public/', '.vercel', 'package-lock', 'yarn.lock', 'pnpm-lock',
  '__pycache__', '.turbo', 'coverage',
];

const VOYAGE_API = 'https://api.voyageai.com/v1/embeddings';
const CHUNK_SIZE = 120;
const CHUNK_OVERLAP = 15;

function shouldIndex(path: string): boolean {
  const lower = path.toLowerCase();
  if (EXCLUDE_PATHS.some(ex => lower.includes(ex))) return false;
  if (!INCLUDE_EXTS.some(ext => lower.endsWith(ext))) return false;
  if (lower.endsWith('.d.ts')) return false;
  if (lower.endsWith('.min.js')) return false;
  return true;
}

function chunkText(text: string, filePath: string): Array<{ content: string; chunkIndex: number }> {
  const lines = text.split('\n');
  const chunks: Array<{ content: string; chunkIndex: number }> = [];

  if (lines.length <= CHUNK_SIZE) {
    chunks.push({ content: `// File: ${filePath}\n${text}`, chunkIndex: 0 });
    return chunks;
  }

  let i = 0;
  let chunkIndex = 0;
  while (i < lines.length) {
    const slice = lines.slice(i, i + CHUNK_SIZE).join('\n');
    chunks.push({
      content: `// File: ${filePath} (lines ${i + 1}-${Math.min(i + CHUNK_SIZE, lines.length)})\n${slice}`,
      chunkIndex,
    });
    i += CHUNK_SIZE - CHUNK_OVERLAP;
    chunkIndex++;
  }
  return chunks;
}

async function githubFetch(path: string, token: string) {
  const url = `https://api.github.com/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listRepoFiles(token: string): Promise<Array<{ path: string; sha: string; size: number }>> {
  const tree = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`,
    token
  );
  return (tree.tree ?? [])
    .filter((f: { type: string; path: string; size: number; sha: string }) =>
      f.type === 'blob' && shouldIndex(f.path) && f.size < 200_000
    )
    .map((f: { path: string; sha: string; size: number }) => ({ path: f.path, sha: f.sha, size: f.size }));
}

async function getFileContent(filePath: string, token: string): Promise<string> {
  const data = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs/${filePath}`,
    token
  );
  if (data.encoding === 'base64') {
    return Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf-8');
  }
  return data.content ?? '';
}

async function getFileContentBySha(sha: string, token: string): Promise<string> {
  const data = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs/${sha}`,
    token
  );
  if (data.encoding === 'base64') {
    return Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf-8');
  }
  return data.content ?? '';
}

async function embedTexts(texts: string[], voyageApiKey: string): Promise<number[][]> {
  const res = await fetch(VOYAGE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${voyageApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'voyage-code-3',
      input: texts,
      input_type: 'document',
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`Voyage API error ${res.status}: ${errText}`);
  }
  const json = await res.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const githubToken = process.env.GITHUB_TOKEN;
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (!githubToken) return NextResponse.json({ error: 'Missing GITHUB_TOKEN' }, { status: 500 });
    if (!voyageKey) return NextResponse.json({ error: 'Missing VOYAGE_API_KEY' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const forceReindex = body?.force === true;

    const db = createAdminClient();

    // Load existing SHAs to skip unchanged files
    const { data: existingRows, error: existingErr } = await db
      .from('code_embeddings')
      .select('file_path, sha');

    if (existingErr) {
      return NextResponse.json({ error: `DB error loading existing index: ${existingErr.message}` }, { status: 500 });
    }

    const existingShaByPath = new Map<string, string>();
    for (const row of existingRows ?? []) {
      existingShaByPath.set(row.file_path, row.sha ?? '');
    }

    // Get all files from GitHub
    logger.info('Listing repo files from GitHub…');
    const files = await listRepoFiles(githubToken);
    logger.info(`Found ${files.length} indexable files`);

    // Filter files that need re-indexing
    const filesToIndex = forceReindex
      ? files
      : files.filter(f => existingShaByPath.get(f.path) !== f.sha);

    const skipped = files.length - filesToIndex.length;
    logger.info(`Will index ${filesToIndex.length} files, skip ${skipped}`);

    let indexed = 0;
    const errors: string[] = [];

    // Process files in parallel batches of 10
    const PARALLEL_BATCH = 10;
    const EMBED_BATCH = 32;
    const DB_BATCH = 100;

    const allToUpsert: Array<{
      file_path: string;
      chunk_index: number;
      content: string;
      embedding: number[];
      sha: string;
    }> = [];

    for (let i = 0; i < filesToIndex.length; i += PARALLEL_BATCH) {
      // Check time remaining — stop at 240s to leave buffer for final flush
      if (Date.now() - startTime > 240_000) {
        logger.warn('Approaching timeout, stopping early', { indexed, remaining: filesToIndex.length - i });
        errors.push(`Timeout: only indexed ${indexed}/${filesToIndex.length} files. Run again to continue.`);
        break;
      }

      const batch = filesToIndex.slice(i, i + PARALLEL_BATCH);

      // Fetch file contents in parallel
      const fetchResults = await Promise.allSettled(
        batch.map(async (file) => {
          // Delete old embeddings for this file before re-indexing
          if (existingShaByPath.has(file.path)) {
            await db.from('code_embeddings').delete().eq('file_path', file.path);
          }
          const content = await getFileContentBySha(file.sha, githubToken);
          return { file, content };
        })
      );

      // Collect chunks to embed
      const pendingTexts: string[] = [];
      const pendingMeta: Array<{ file_path: string; chunk_index: number; sha: string }> = [];

      for (const result of fetchResults) {
        if (result.status === 'rejected') {
          const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          errors.push(msg);
          logger.warn('File fetch error', { error: msg });
          continue;
        }
        const { file, content } = result.value;
        if (!content.trim()) { continue; }

        const chunks = chunkText(content, file.path);
        for (const chunk of chunks) {
          pendingTexts.push(chunk.content);
          pendingMeta.push({ file_path: file.path, chunk_index: chunk.chunkIndex, sha: file.sha });
        }
        indexed++;
      }

      // Embed in sub-batches
      for (let ei = 0; ei < pendingTexts.length; ei += EMBED_BATCH) {
        const textBatch = pendingTexts.slice(ei, ei + EMBED_BATCH);
        const metaBatch = pendingMeta.slice(ei, ei + EMBED_BATCH);
        try {
          const embeddings = await embedTexts(textBatch, voyageKey);
          for (let j = 0; j < metaBatch.length; j++) {
            allToUpsert.push({ ...metaBatch[j], content: textBatch[j], embedding: embeddings[j] });
          }
        } catch (embedErr) {
          const msg = embedErr instanceof Error ? embedErr.message : String(embedErr);
          logger.warn('Embed error', { error: msg, batchSize: textBatch.length });
          errors.push(`Embed error: ${msg}`);
        }
      }

      // Flush upserts when batch grows large enough
      if (allToUpsert.length >= 200) {
        await flushToDb(allToUpsert, db);
      }
    }

    // Final upsert flush
    if (allToUpsert.length > 0) {
      await flushToDb(allToUpsert, db);
    }

    logger.info('Indexing complete', { indexed, skipped, errors: errors.length, elapsedMs: Date.now() - startTime });
    return NextResponse.json({
      ok: true,
      indexed,
      skipped,
      errors: errors.slice(0, 20),
      totalFiles: files.length,
      elapsedMs: Date.now() - startTime,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('dev index POST failed', { error: msg, elapsedMs: Date.now() - startTime });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function flushToDb(
  records: Array<{ file_path: string; chunk_index: number; content: string; embedding: number[]; sha: string }>,
  db: ReturnType<typeof createAdminClient>
) {
  const DB_BATCH = 100;
  const now = new Date().toISOString();
  for (let i = 0; i < records.length; i += DB_BATCH) {
    const batch = records.slice(i, i + DB_BATCH).map(r => ({
      file_path: r.file_path,
      chunk_index: r.chunk_index,
      content: r.content,
      embedding: JSON.stringify(r.embedding),
      sha: r.sha,
      indexed_at: now,
    }));
    const { error } = await db.from('code_embeddings').upsert(batch, {
      onConflict: 'file_path,chunk_index',
    });
    if (error) logger.error('Upsert error', { error: error.message });
  }
  records.length = 0;
}

// GET: return index status
export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const db = createAdminClient();
    const { count } = await db
      .from('code_embeddings')
      .select('*', { count: 'exact', head: true });

    const { data: latest } = await db
      .from('code_embeddings')
      .select('indexed_at')
      .order('indexed_at', { ascending: false })
      .limit(1)
      .single();

    const { data: fileCounts } = await db
      .from('code_embeddings')
      .select('file_path')
      .limit(10000);

    const uniqueFiles = new Set((fileCounts ?? []).map(r => r.file_path)).size;

    return NextResponse.json({
      totalChunks: count ?? 0,
      uniqueFiles,
      lastIndexed: latest?.indexed_at ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
