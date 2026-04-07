export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const logger = createLogger('dev-webhook');

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';
const GITHUB_BRANCH = 'main';
const VOYAGE_API = 'https://api.voyageai.com/v1/embeddings';
const CHUNK_SIZE = 120;
const CHUNK_OVERLAP = 15;

const INCLUDE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.sql', '.md', '.json'];
const EXCLUDE_PATHS = [
  'node_modules', '.next', '.git', 'dist', 'build',
  'public/', '.vercel', 'package-lock', 'yarn.lock', 'pnpm-lock',
  '__pycache__', '.turbo', 'coverage',
];

function shouldIndex(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  if (EXCLUDE_PATHS.some(ex => lower.includes(ex))) return false;
  if (lower.endsWith('.d.ts') || lower.endsWith('.min.js')) return false;
  return INCLUDE_EXTS.some(ext => lower.endsWith(ext));
}

function chunkText(text: string, filePath: string): Array<{ content: string; chunkIndex: number }> {
  const lines = text.split('\n');
  if (lines.length <= CHUNK_SIZE) {
    return [{ content: `// File: ${filePath}\n${text}`, chunkIndex: 0 }];
  }
  const chunks: Array<{ content: string; chunkIndex: number }> = [];
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

function verifyGitHubSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function getFileContent(filePath: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.encoding === 'base64') return Buffer.from(data.content, 'base64').toString('utf-8');
    return data.content ?? null;
  } catch {
    return null;
  }
}

async function embedTexts(texts: string[], voyageKey: string): Promise<number[][]> {
  const res = await fetch(VOYAGE_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'voyage-code-3', input: texts, input_type: 'document' }),
  });
  if (!res.ok) throw new Error(`Voyage error: ${res.status}`);
  const json = await res.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256') ?? '';
    const event = request.headers.get('x-github-event') ?? '';

    // Validate signature using GITHUB_WEBHOOK_SECRET or CRON_SECRET as fallback
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? process.env.CRON_SECRET ?? '';
    if (webhookSecret && !verifyGitHubSignature(rawBody, signature, webhookSecret)) {
      logger.warn('Invalid GitHub webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Only handle push events to main
    if (event !== 'push') {
      return NextResponse.json({ ok: true, skipped: `event=${event}` });
    }

    const payload = JSON.parse(rawBody);
    const branch = (payload.ref ?? '').replace('refs/heads/', '');
    if (branch !== GITHUB_BRANCH) {
      return NextResponse.json({ ok: true, skipped: `branch=${branch}` });
    }

    // Collect all changed/added files from commits
    const changedFiles = new Set<string>();
    const removedFiles = new Set<string>();

    for (const commit of payload.commits ?? []) {
      for (const f of [...(commit.added ?? []), ...(commit.modified ?? [])]) {
        if (shouldIndex(f)) changedFiles.add(f);
      }
      for (const f of commit.removed ?? []) {
        removedFiles.add(f);
      }
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (!githubToken || !voyageKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const db = createAdminClient();
    let indexed = 0;
    let removed = 0;

    // Remove deleted files from index
    for (const filePath of Array.from(removedFiles)) {
      await db.from('code_embeddings').delete().eq('file_path', filePath);
      removed++;
    }

    // Re-index changed/added files
    const allTexts: string[] = [];
    const allMeta: Array<{ file_path: string; chunk_index: number; sha: string }> = [];

    for (const filePath of Array.from(changedFiles)) {
      const content = await getFileContent(filePath, githubToken);
      if (!content?.trim()) continue;

      // Delete old chunks for this file
      await db.from('code_embeddings').delete().eq('file_path', filePath);

      const chunks = chunkText(content, filePath);
      const sha = payload.after ?? '';
      for (const chunk of chunks) {
        allTexts.push(chunk.content);
        allMeta.push({ file_path: filePath, chunk_index: chunk.chunkIndex, sha });
      }
      indexed++;
    }

    // Embed in batches of 32
    if (allTexts.length > 0) {
      const BATCH = 32;
      for (let i = 0; i < allTexts.length; i += BATCH) {
        const batchTexts = allTexts.slice(i, i + BATCH);
        const batchMeta = allMeta.slice(i, i + BATCH);
        const embeddings = await embedTexts(batchTexts, voyageKey);
        const rows = batchMeta.map((m, j) => ({
          file_path: m.file_path,
          chunk_index: m.chunk_index,
          content: batchTexts[j],
          embedding: JSON.stringify(embeddings[j]),
          sha: m.sha,
          indexed_at: new Date().toISOString(),
        }));
        await db.from('code_embeddings').upsert(rows, { onConflict: 'file_path,chunk_index' });
      }
    }

    logger.info('Webhook re-index done', { indexed, removed, changedFiles: changedFiles.size });
    return NextResponse.json({ ok: true, indexed, removed });
  } catch (err) {
    logger.error('Webhook error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
