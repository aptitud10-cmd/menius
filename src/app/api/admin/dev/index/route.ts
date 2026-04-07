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

// File extensions to index
const INCLUDE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.sql', '.md', '.json'];
// Paths to skip entirely
const EXCLUDE_PATHS = [
  'node_modules', '.next', '.git', 'dist', 'build',
  'public/', '.vercel', 'package-lock', 'yarn.lock', 'pnpm-lock',
  '__pycache__', '.turbo', 'coverage',
];

const VOYAGE_API = 'https://api.voyageai.com/v1/embeddings';
const CHUNK_SIZE = 120;    // lines per chunk
const CHUNK_OVERLAP = 15;  // overlap lines between chunks

function shouldIndex(path: string): boolean {
  const lower = path.toLowerCase();
  if (EXCLUDE_PATHS.some(ex => lower.includes(ex))) return false;
  if (!INCLUDE_EXTS.some(ext => lower.endsWith(ext))) return false;
  if (lower.endsWith('.d.ts')) return false;
  if (lower.endsWith('.min.js')) return false;
  if (path.includes('supabase/migrations') && !path.endsWith('migration.sql')) return true;
  return true;
}

function chunkText(text: string, filePath: string): Array<{ content: string; chunkIndex: number }> {
  const lines = text.split('\n');
  const chunks: Array<{ content: string; chunkIndex: number }> = [];

  // For small files, keep as single chunk
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
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
    token
  );
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
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
  if (!res.ok) throw new Error(`Voyage API error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const githubToken = process.env.GITHUB_TOKEN;
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (!githubToken || !voyageKey) {
      return NextResponse.json({ error: 'Missing GITHUB_TOKEN or VOYAGE_API_KEY' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const forceReindex = body?.force === true;

    const db = createAdminClient();

    // Load existing SHAs to skip unchanged files
    const { data: existingRows } = await db
      .from('code_embeddings')
      .select('file_path, sha, chunk_index');

    const existingBySha = new Map<string, Set<number>>();
    const existingByShaVal = new Map<string, string>();
    for (const row of existingRows ?? []) {
      const key = row.file_path;
      if (!existingBySha.has(key)) existingBySha.set(key, new Set());
      existingBySha.get(key)!.add(row.chunk_index);
      existingByShaVal.set(key, row.sha ?? '');
    }

    // Get all files from GitHub
    logger.info('Listing repo files from GitHub…');
    const files = await listRepoFiles(githubToken);
    logger.info(`Found ${files.length} indexable files`);

    let indexed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches to embed (Voyage allows up to 128 texts per call)
    const EMBED_BATCH = 32;
    const toUpsert: Array<{
      file_path: string;
      chunk_index: number;
      content: string;
      embedding: number[];
      sha: string;
    }> = [];

    const pendingTexts: string[] = [];
    const pendingMeta: Array<{ file_path: string; chunk_index: number; sha: string }> = [];

    const flushEmbedBatch = async () => {
      if (pendingTexts.length === 0) return;
      const embeddings = await embedTexts(pendingTexts, voyageKey!);
      for (let i = 0; i < pendingMeta.length; i++) {
        toUpsert.push({ ...pendingMeta[i], content: pendingTexts[i], embedding: embeddings[i] });
      }
      pendingTexts.length = 0;
      pendingMeta.length = 0;
    };

    const flushUpsert = async () => {
      if (toUpsert.length === 0) return;
      const DB_BATCH = 100;
      for (let i = 0; i < toUpsert.length; i += DB_BATCH) {
        const batch = toUpsert.slice(i, i + DB_BATCH).map(r => ({
          file_path: r.file_path,
          chunk_index: r.chunk_index,
          content: r.content,
          embedding: JSON.stringify(r.embedding),
          sha: r.sha,
          indexed_at: new Date().toISOString(),
        }));
        const { error } = await db.from('code_embeddings').upsert(batch, {
          onConflict: 'file_path,chunk_index',
        });
        if (error) logger.error('Upsert error', { error: error.message });
      }
      toUpsert.length = 0;
    };

    for (const file of files) {
      try {
        // Skip if SHA hasn't changed and we're not force re-indexing
        if (!forceReindex && existingByShaVal.get(file.path) === file.sha) {
          skipped++;
          continue;
        }

        const content = await getFileContent(file.path, githubToken);
        if (!content.trim()) { skipped++; continue; }

        // Delete old chunks for this file (SHA changed = re-index)
        if (existingBySha.has(file.path)) {
          await db.from('code_embeddings').delete().eq('file_path', file.path);
        }

        const chunks = chunkText(content, file.path);
        for (const chunk of chunks) {
          pendingTexts.push(chunk.content);
          pendingMeta.push({ file_path: file.path, chunk_index: chunk.chunkIndex, sha: file.sha });

          if (pendingTexts.length >= EMBED_BATCH) {
            await flushEmbedBatch();
          }
          if (toUpsert.length >= 200) {
            await flushUpsert();
          }
        }
        indexed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${file.path}: ${msg}`);
        logger.warn('File index error', { path: file.path, error: msg });
      }
    }

    // Flush remaining
    await flushEmbedBatch();
    await flushUpsert();

    logger.info('Indexing complete', { indexed, skipped, errors: errors.length });
    return NextResponse.json({
      ok: true,
      indexed,
      skipped,
      errors: errors.slice(0, 20),
      totalFiles: files.length,
    });
  } catch (err) {
    logger.error('dev index POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
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
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
