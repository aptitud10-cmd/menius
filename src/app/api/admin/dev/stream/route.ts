export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO  = 'menius';
const GITHUB_BRANCH = 'main';
const VOYAGE_API = 'https://api.voyageai.com/v1';

// ─── Helpers (self-contained) ─────────────────────────────────────────────────
async function githubFetch(apiPath: string, token: string) {
  const res = await fetch(`https://api.github.com/${apiPath}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error(`GitHub ${apiPath}: ${res.status}`);
  return res.json();
}

async function readFileGH(filePath: string, token: string): Promise<string> {
  const data = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`, token
  );
  return data.encoding === 'base64' ? Buffer.from(data.content, 'base64').toString('utf-8') : (data.content ?? '');
}

async function searchCode(query: string, limit: number, voyageKey: string, db: ReturnType<typeof createAdminClient>): Promise<string> {
  if (!voyageKey) return 'VOYAGE_API_KEY not configured. Index the codebase first.';
  const embedRes = await fetch(`${VOYAGE_API}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'voyage-code-3', input: [query], input_type: 'query' }),
  });
  if (!embedRes.ok) throw new Error(`Voyage embed: ${embedRes.status}`);
  const embedding = (await embedRes.json()).data[0].embedding;

  const { data: rows, error } = await db.rpc('search_code_embeddings', {
    query_embedding: JSON.stringify(embedding),
    match_count: Math.min(limit * 2, 40),
  });
  if (error) throw new Error(`pgvector: ${error.message}`);
  if (!rows?.length) return 'No results found. The codebase may not be indexed yet.';

  const rerankRes = await fetch(`${VOYAGE_API}/rerank`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'rerank-2', query, documents: rows.map((r: { content: string }) => r.content), top_k: Math.min(limit, 10), return_documents: false }),
  });
  const topIndices: number[] = rerankRes.ok
    ? (await rerankRes.json()).data.map((r: { index: number }) => r.index)
    : rows.slice(0, limit).map((_: unknown, i: number) => i);

  return topIndices.map(i => {
    const r = rows[i] as { file_path: string; content: string };
    return `### ${r.file_path}\n\`\`\`\n${r.content.slice(0, 3000)}\n\`\`\``;
  }).join('\n\n');
}

async function searchWebTavily(query: string, tavilyKey: string): Promise<string> {
  if (!tavilyKey) return 'TAVILY_API_KEY not configured.';
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: tavilyKey, query, search_depth: 'advanced', max_results: 6, include_answer: true }),
  });
  if (!res.ok) throw new Error(`Tavily: ${res.status}`);
  const json = await res.json();
  const parts: string[] = [];
  if (json.answer) parts.push(`**Answer**: ${json.answer}`);
  for (const r of (json.results ?? []).slice(0, 6)) {
    parts.push(`**${r.title}** (${r.url})\n${r.content?.slice(0, 600) ?? ''}`);
  }
  return parts.join('\n\n') || 'No results.';
}

async function fetchUrl(url: string): Promise<string> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'Error: URL must start with http:// or https://';
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MeniusDevBot/1.0 (compatible; +https://menius.app)' },
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok) return `HTTP ${res.status} ${res.statusText} from ${url}`;
    if (contentType.includes('application/json')) {
      const json = await res.json();
      return `**${url}** (JSON)\n\`\`\`json\n${JSON.stringify(json, null, 2).slice(0, 8000)}\n\`\`\``;
    }
    const html = await res.text();
    // Strip HTML tags, collapse whitespace, remove scripts/styles
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return `**Content from ${url}**\n\n${text.slice(0, 10000)}`;
  } catch (err) {
    return `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function queryStripe(query: string): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return 'STRIPE_SECRET_KEY not configured.';
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' });
  const q = query.toLowerCase();

  try {
    // Revenue / charges
    if (q.includes('revenue') || q.includes('charge') || q.includes('payment') || q.includes('ingreso') || q.includes('pago')) {
      const charges = await stripe.charges.list({ limit: 100 });
      const total = charges.data.filter(c => c.paid && !c.refunded).reduce((s, c) => s + c.amount, 0);
      const byMonth: Record<string, number> = {};
      for (const c of charges.data) {
        if (c.paid) {
          const month = new Date(c.created * 1000).toISOString().slice(0, 7);
          byMonth[month] = (byMonth[month] ?? 0) + c.amount;
        }
      }
      return `**Stripe Revenue (last 100 charges)**\nTotal: $${(total / 100).toFixed(2)}\n\nBy month:\n${Object.entries(byMonth).sort().map(([m, v]) => `- ${m}: $${(v / 100).toFixed(2)}`).join('\n')}`;
    }

    // Subscriptions
    if (q.includes('subscription') || q.includes('suscripcion') || q.includes('suscripción') || q.includes('plan')) {
      const subs = await stripe.subscriptions.list({ limit: 100 });
      const active = subs.data.filter(s => s.status === 'active').length;
      const trialing = subs.data.filter(s => s.status === 'trialing').length;
      const canceled = subs.data.filter(s => s.status === 'canceled').length;
      const pastDue = subs.data.filter(s => s.status === 'past_due').length;
      const mrr = subs.data
        .filter(s => s.status === 'active' || s.status === 'past_due')
        .reduce((sum, s) => sum + (s.items.data[0]?.price?.unit_amount ?? 0), 0);
      return `**Stripe Subscriptions**\nActive: ${active} | Trialing: ${trialing} | Past Due: ${pastDue} | Canceled: ${canceled}\nEstimated MRR: $${(mrr / 100).toFixed(2)}/mo`;
    }

    // Customers
    if (q.includes('customer') || q.includes('cliente')) {
      const customers = await stripe.customers.list({ limit: 10 });
      const rows = customers.data.map(c =>
        `- ${c.email ?? 'no-email'} | ${c.name ?? ''} | Created: ${new Date(c.created * 1000).toLocaleDateString()}`
      );
      return `**Recent Stripe Customers (last 10)**\n${rows.join('\n')}`;
    }

    return `I can answer questions about: revenue/payments, subscriptions/plans, customers. Ask me one of those!`;
  } catch (err) {
    return `Stripe error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function listFiles(dirPath: string, token: string): Promise<string> {
  try {
    const data = await githubFetch(`repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${dirPath}?ref=${GITHUB_BRANCH}`, token);
    if (!Array.isArray(data)) return JSON.stringify(data);
    return data.map((f: { name: string; type: string; size?: number }) =>
      `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size}b)` : ''}`
    ).join('\n');
  } catch (err) { return `Error: ${err instanceof Error ? err.message : String(err)}`; }
}

async function queryDB(sql: string, db: ReturnType<typeof createAdminClient>): Promise<string> {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) return 'Only SELECT queries allowed.';
  const dangerous = ['DROP','DELETE','INSERT','UPDATE','TRUNCATE','ALTER','CREATE','GRANT','REVOKE'];
  if (dangerous.some(kw => trimmed.includes(kw))) return 'Query contains restricted keywords.';
  try {
    const { data, error } = await db.rpc('exec_readonly_sql', { sql_query: sql });
    if (error) return `DB Error: ${error.message}`;
    return JSON.stringify(data, null, 2).slice(0, 5000);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : String(e)}`; }
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  let claudeMd = '';
  try {
    const p = path.join(process.cwd(), 'CLAUDE.md');
    if (fs.existsSync(p)) claudeMd = fs.readFileSync(p, 'utf-8');
  } catch { /* ignore */ }

  return `You are an elite software engineer and technical co-founder of Menius — a Next.js 14 SaaS platform for restaurants in Latin America. You have deep, expert-level knowledge of the entire codebase, architecture, and business logic.

${claudeMd ? claudeMd : ''}

---

## Cómo operar (REGLAS CRÍTICAS)

### Antes de cualquier cambio de código:
1. **search_code** primero — busca semánticamente qué archivos son relevantes
2. **read_file** — lee el archivo completo antes de editarlo (nunca editar a ciegas)
3. **list_files** si necesitas explorar estructura
4. **query_database** si necesitas ver datos reales de producción
5. **search_web** para documentación externa, errores de npm, best practices actuales

### Cuando recibes imágenes:
- Analiza la imagen primero antes de proponer cambios
- Si es un screenshot de bug: identifica el componente, busca el código, propón fix
- Si es un diseño/mockup: implementa en código siguiendo los patrones de Menius

### Al escribir código:
- Cambios QUIRÚRGICOS — mínimos y precisos. No tocar lo que no es necesario.
- TypeScript strict — NO any, tipos explícitos
- Sin comentarios que explican lo obvio
- Imports siempre al tope del archivo
- Respetar los patrones existentes del archivo
- SIEMPRE usar createAdminClient() en route handlers que requieren bypass de RLS
- export const dynamic = 'force-dynamic' en todos los POST handlers

### Para investigaciones, market research, tendencias:
- Usa search_web para buscar información actualizada
- Usa fetch_url para leer documentación específica de librerías o competidores
- Puedo investigar cualquier tema: tecnología, mercado, competidores, best practices
- No limitado solo al código — soy un asistente completo

### Para análisis de negocio:
- Usa query_stripe para métricas de revenue, subscripciones, customers
- Usa query_database para datos de producción de Menius

### Comunicación:
- Respondo en español (el idioma del equipo)
- Explico el razonamiento antes de los cambios
- Enumero riesgos o efectos secundarios
- Si algo es ambiguo, pregunto antes de asumir`;
}

// ─── Tool schemas ─────────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_code',
    description: 'Semantic search through the Menius codebase. Results are AI-reranked. Use before reading or editing any file.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to search for' }, limit: { type: 'number', description: 'Max results (default 5)' } }, required: ['query'] },
  },
  {
    name: 'read_file',
    description: 'Read a file from the GitHub repo. Always read before editing.',
    input_schema: { type: 'object' as const, properties: { path: { type: 'string', description: 'e.g. src/app/api/orders/route.ts' } }, required: ['path'] },
  },
  {
    name: 'list_files',
    description: 'List files in a directory of the repo.',
    input_schema: { type: 'object' as const, properties: { path: { type: 'string', description: 'e.g. src/app/api/' } }, required: ['path'] },
  },
  {
    name: 'search_web',
    description: 'Search the internet for docs, trends, solutions, market research, competitor analysis.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'fetch_url',
    description: 'Fetch and read the content of any URL. Use for reading npm docs, API references, competitor sites, or any webpage.',
    input_schema: { type: 'object' as const, properties: { url: { type: 'string', description: 'Full URL to fetch, e.g. https://menius.app/buccaneer' } }, required: ['url'] },
  },
  {
    name: 'write_file',
    description: 'Propose a file change. Provide COMPLETE file content. The user will review and apply.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        content: { type: 'string', description: 'COMPLETE new file content' },
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        explanation: { type: 'string', description: 'What changed and why' },
      },
      required: ['path', 'content', 'action'],
    },
  },
  {
    name: 'query_database',
    description: 'Run a read-only SELECT on the Supabase production database. Useful for debugging and analytics.',
    input_schema: { type: 'object' as const, properties: { sql: { type: 'string', description: 'SELECT query to run' } }, required: ['sql'] },
  },
  {
    name: 'query_stripe',
    description: 'Query Stripe for business metrics: revenue, subscriptions, customers, MRR. Use for business analytics questions.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to query: e.g. "revenue this month", "active subscriptions", "recent customers"' } }, required: ['query'] },
  },
];

const OPENAI_TOOLS = TOOLS.map(t => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

const OPENROUTER_MODEL_IDS = new Set([
  'openai/o3', 'openai/o3-mini', 'openai/o4-mini', 'openai/gpt-4.5',
  'openai/gpt-4o', 'openai/gpt-4o-mini',
  'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout',
  'google/gemini-2.5-pro', 'mistralai/mistral-large',
]);

function isOpenRouterModel(modelId: string): boolean {
  return modelId.includes('/') || OPENROUTER_MODEL_IDS.has(modelId);
}

// ─── Image helpers ────────────────────────────────────────────────────────────
function parseBase64Image(dataUrl: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|gif|webp));base64,(.+)$/);
  if (!match) return null;
  const raw = match[1].replace('image/jpg', 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  return { mediaType: raw, data: match[2] };
}

function buildAnthropicMessages(
  messages: Array<{ role: string; content: string }>,
  lastUserImages: string[],
): Anthropic.MessageParam[] {
  if (lastUserImages.length === 0) {
    return messages as Anthropic.MessageParam[];
  }

  const result: Anthropic.MessageParam[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'user' && i === messages.length - 1 && lastUserImages.length > 0) {
      const imageBlocks: Anthropic.ImageBlockParam[] = lastUserImages
        .map(parseBase64Image)
        .filter((img): img is NonNullable<typeof img> => img !== null)
        .map(img => ({
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
        }));
      result.push({
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: m.content || 'Analiza esta imagen.' },
        ],
      });
    } else {
      result.push(m as Anthropic.MessageParam);
    }
  }
  return result;
}

function buildOpenRouterMessages(
  messages: Array<{ role: string; content: string }>,
  lastUserImages: string[],
): Array<Record<string, unknown>> {
  if (lastUserImages.length === 0) {
    return messages.map(m => ({ role: m.role, content: m.content }));
  }

  return messages.map((m, i) => {
    if (m.role === 'user' && i === messages.length - 1) {
      const imageParts = lastUserImages
        .filter(d => d.startsWith('data:image/'))
        .map(d => ({ type: 'image_url', image_url: { url: d } }));
      return {
        role: 'user',
        content: [
          ...imageParts,
          { type: 'text', text: m.content || 'Analiza esta imagen.' },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
}

// ─── Tool executor ────────────────────────────────────────────────────────────
type PendingChange = { path: string; content: string; action: string; explanation?: string };

async function executeTool(
  name: string,
  inp: Record<string, unknown>,
  { githubToken, voyageKey, tavilyKey, db, send }: {
    githubToken: string;
    voyageKey: string;
    tavilyKey: string;
    db: ReturnType<typeof createAdminClient>;
    send: (type: string, data: object) => void;
  }
): Promise<{ result: string; pendingChange?: PendingChange }> {
  switch (name) {
    case 'search_code':
      return { result: await searchCode(inp.query as string, Math.min((inp.limit as number) ?? 5, 10), voyageKey, db) };
    case 'read_file':
      return { result: `\`\`\`\n${(await readFileGH(inp.path as string, githubToken)).slice(0, 8000)}\n\`\`\`` };
    case 'list_files':
      return { result: await listFiles(inp.path as string, githubToken) };
    case 'search_web':
      return { result: await searchWebTavily(inp.query as string, tavilyKey) };
    case 'fetch_url':
      return { result: await fetchUrl(inp.url as string) };
    case 'write_file': {
      const pendingChange: PendingChange = {
        path: inp.path as string,
        content: inp.content as string,
        action: (inp.action as string) ?? 'update',
        explanation: inp.explanation as string | undefined,
      };
      send('pending_change', pendingChange);
      return { result: `File change prepared: ${pendingChange.action} ${pendingChange.path}`, pendingChange };
    }
    case 'query_database':
      return { result: await queryDB(inp.sql as string, db) };
    case 'query_stripe':
      return { result: await queryStripe(inp.query as string) };
    default:
      return { result: `Unknown tool: ${name}` };
  }
}

// ─── OpenRouter stream loop ───────────────────────────────────────────────────
async function runOpenRouterStream(
  modelId: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  lastUserImages: string[],
  githubToken: string,
  voyageKey: string,
  tavilyKey: string,
  db: ReturnType<typeof createAdminClient>,
  openrouterKey: string,
  send: (type: string, data: object) => void,
): Promise<void> {
  const headers = {
    'Authorization': `Bearer ${openrouterKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://menius.app',
    'X-Title': 'Menius Dev Tool',
  };

  const currentMessages: Array<Record<string, unknown>> = [
    { role: 'system', content: systemPrompt },
    ...buildOpenRouterMessages(messages, lastUserImages),
  ];

  const MAX_ROUNDS = 8;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: currentMessages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        stream: true,
        max_tokens: 8192,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenRouter ${res.status}: ${await res.text().catch(() => 'unknown')}`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let assistantContent = '';
    const pendingToolCalls: Record<number, { id: string; name: string; arguments: string }> = {};
    let finishReason = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { finishReason = finishReason || 'stop'; break outer; }
        try {
          const chunk = JSON.parse(raw);
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;
          const delta = choice.delta ?? {};

          if (delta.content) {
            assistantContent += delta.content;
            send('token', { text: delta.content });
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls as Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>) {
              if (!pendingToolCalls[tc.index]) {
                pendingToolCalls[tc.index] = { id: tc.id ?? '', name: tc.function?.name ?? '', arguments: '' };
                if (tc.function?.name) send('tool_call', { name: tc.function.name, id: tc.id });
              }
              if (tc.function?.arguments) pendingToolCalls[tc.index].arguments += tc.function.arguments;
            }
          }
        } catch { /* ignore parse errors */ }
      }
    }

    const toolCallList = Object.values(pendingToolCalls);

    if (toolCallList.length > 0) {
      currentMessages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCallList.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } })),
      });

      for (const tc of toolCallList) {
        let result = '';
        try {
          send('tool_running', { name: tc.name });
          const inp = JSON.parse(tc.arguments || '{}') as Record<string, unknown>;
          const r = await executeTool(tc.name, inp, { githubToken, voyageKey, tavilyKey, db, send });
          result = r.result;
          send('tool_done', { name: tc.name, resultLength: result.length });
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
          send('tool_error', { name: tc.name, error: result });
        }
        currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: result.slice(0, 50000) });
      }
    } else {
      break;
    }
  }
}

// ─── SSE encoder ──────────────────────────────────────────────────────────────
function sseEvent(type: string, data: object): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) {
    return new Response('Unauthorized', { status: 403 });
  }

  const githubToken = process.env.GITHUB_TOKEN ?? '';
  const voyageKey   = process.env.VOYAGE_API_KEY ?? '';
  const tavilyKey   = process.env.TAVILY_API_KEY ?? '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? '';

  if (!anthropicKey || !githubToken) {
    return new Response('Missing ANTHROPIC_API_KEY or GITHUB_TOKEN', { status: 500 });
  }

  const body = await request.json();
  const {
    messages,
    model,
    images: lastUserImages = [],
    thinking: thinkingMode = false,
  } = body as {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    images?: string[];
    thinking?: boolean;
  };

  const resolvedModel = (() => {
    const m = model ?? 'claude-sonnet-4-5';
    const map: Record<string, string> = {
      opus: 'claude-opus-4-5', sonnet: 'claude-sonnet-4-5', haiku: 'claude-haiku-3-5',
    };
    return map[m] ?? m;
  })();

  const db = createAdminClient();
  const client = new Anthropic({ apiKey: anthropicKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: object) => {
        controller.enqueue(encoder.encode(sseEvent(type, data)));
      };

      if (isOpenRouterModel(resolvedModel)) {
        if (!openrouterKey) {
          send('error', { message: 'Missing OPENROUTER_API_KEY. Add it in Vercel env vars.' });
          controller.close();
          return;
        }
        try {
          await runOpenRouterStream(
            resolvedModel, buildSystemPrompt(), messages, lastUserImages,
            githubToken, voyageKey, tavilyKey, db, openrouterKey, send
          );
          send('done', { pendingChanges: [] });
        } catch (err) {
          send('error', { message: err instanceof Error ? err.message : 'OpenRouter error' });
        }
        controller.close();
        return;
      }

      try {
        const anthropicMessages = buildAnthropicMessages(messages, lastUserImages);
        let currentMessages = [...anthropicMessages] as Anthropic.MessageParam[];
        const pendingChanges: PendingChange[] = [];
        const MAX_ROUNDS = 10;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const contentBlocks: Anthropic.ContentBlock[] = [];
          let currentTextBlock = '';
          let currentToolUse: Anthropic.ToolUseBlock | null = null;
          let toolInputJson = '';

          const streamParams: Parameters<typeof client.messages.stream>[0] = {
            model: resolvedModel,
            max_tokens: thinkingMode ? 16000 : 8192,
            system: buildSystemPrompt(),
            tools: TOOLS,
            messages: currentMessages,
          };

          const anthropicStream = await client.messages.stream(streamParams);

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'content_block_start') {
              if (chunk.content_block.type === 'text') {
                currentTextBlock = '';
              } else if (chunk.content_block.type === 'tool_use') {
                currentToolUse = { ...chunk.content_block, input: {} };
                toolInputJson = '';
                send('tool_call', { name: chunk.content_block.name, id: chunk.content_block.id });
              }
            } else if (chunk.type === 'content_block_delta') {
              if (chunk.delta.type === 'text_delta') {
                currentTextBlock += chunk.delta.text;
                send('token', { text: chunk.delta.text });
              } else if (chunk.delta.type === 'input_json_delta') {
                toolInputJson += chunk.delta.partial_json;
              }
            } else if (chunk.type === 'content_block_stop') {
              if (currentTextBlock) {
                contentBlocks.push({ type: 'text', text: currentTextBlock, citations: [] } as Anthropic.TextBlock);
                currentTextBlock = '';
              }
              if (currentToolUse) {
                try { currentToolUse.input = JSON.parse(toolInputJson || '{}'); } catch { currentToolUse.input = {}; }
                contentBlocks.push(currentToolUse);
                currentToolUse = null;
                toolInputJson = '';
              }
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          totalInputTokens += finalMessage.usage?.input_tokens ?? 0;
          totalOutputTokens += finalMessage.usage?.output_tokens ?? 0;
          if (finalMessage.stop_reason !== 'tool_use') break;

          const toolUseBlocks = contentBlocks.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
          if (!toolUseBlocks.length) break;

          currentMessages.push({ role: 'assistant', content: contentBlocks });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of toolUseBlocks) {
            const inp = toolUse.input as Record<string, unknown>;
            let result = '';
            try {
              send('tool_running', { name: toolUse.name });
              const r = await executeTool(toolUse.name, inp, { githubToken, voyageKey, tavilyKey, db, send });
              result = r.result;
              if (r.pendingChange) pendingChanges.push(r.pendingChange);
              send('tool_done', { name: toolUse.name, resultLength: result.length });
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`;
              send('tool_error', { name: toolUse.name, error: result });
            }
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result.slice(0, 50000) });
          }

          currentMessages.push({ role: 'user', content: toolResults });
        }

        send('usage', { inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
        send('done', { pendingChanges });
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'Error interno' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
