export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';
import { Buffer } from 'buffer'; // Still needed for parseBase64Image

import {
  githubFetch, readFileGH, listFiles, getRelatedFiles,
  searchCode, searchWebTavily, fetchUrl, rollbackVercel,
  queryStripe, queryDB, writeDB, getSupabaseSchema,
  getVercelEnvVars, getVercelFunctionLogs, getSentryErrors
} from '@/lib/dev-tool/file-utils';

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';
const GITHUB_BRANCH = 'main';
const VOYAGE_API = 'https://api.voyageai.com/v1';

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

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(recentConvSummaries: string[] = []): string {
  // fs and path are not needed here since CLAUDE.md is bundled and read at build time
  const claudeMd = process.env.CLAUDE_MD_CONTENT || '';

  const memorySection = recentConvSummaries.length > 0
    ? `\n\n## Contexto de conversaciones recientes (memoria)\n${recentConvSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : '';

  return `You are an elite software engineer and technical co-founder of Menius — a Next.js 14 SaaS platform for restaurants in Latin America. You have deep, expert-level knowledge of the entire codebase, architecture, and business logic.${memorySection}\n\n${claudeMd ? claudeMd : ''}\n\n---\n\n## SELECCIÓN DE HERRAMIENTA — REGLA DE ORO\n\n**Antes de cualquier acción, determina el tipo de pregunta y usa la herramienta correcta INMEDIATAMENTE:**\n\n### TIPO: Datos en producción → USA query_database PRIMERO (NO search_code)\nEjemplos de trigger:\n- "qué tiendas se registraron esta semana / mes"
- "cuántos pedidos hay hoy / pendientes / completados"
- "qué restaurantes tienen suscripción activa"
- "cuántos usuarios hay / quién se registró"
- "cuál es el total de órdenes de [tienda]"
- "hay algún error en las órdenes"
- Cualquier pregunta con datos, números, fechas o estado de producción\n\nSQL de referencia:\nSELECT name, slug, created_at FROM restaurants WHERE created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC;\nSELECT count(*), status FROM orders WHERE created_at::date = CURRENT_DATE GROUP BY status;\nSELECT r.name, r.slug FROM restaurants r WHERE r.stripe_subscription_status = 'active';\n\n### TIPO: Métricas de negocio / revenue → USA query_stripe PRIMERO\n- "cuánto revenue este mes", "MRR", "clientes de pago", "cancelaciones"\n\n### TIPO: Preguntas sobre el código fuente → USA search_code PRIMERO\n- "cómo funciona X", "dónde está Y implementado", "qué hace este componente"
- Solo para código, NO para datos de producción\n\n### TIPO: Investigación / tendencias / docs externas → USA search_web PRIMERO\n- market research, competidores, tecnologías, best practices, documentación de librerías\n\n### TIPO: Bug en screenshot → Analiza imagen + search_code para el componente\n- Identifica el componente visual, búscalo en el código, propón el fix quirúrgico\n\n---\n\n## Reglas para cambios de código\n\n- Cambios QUIRÚRGICOS — mínimos y precisos. No tocar lo que no es necesario.\n- TypeScript strict — NO any, tipos explícitos\n- Sin comentarios que explican lo obvio\n- Imports siempre al tope del archivo\n- Respetar los patrones existentes del archivo\n- SIEMPRE usar createAdminClient() en route handlers que requieren bypass de RLS\n- export const dynamic = 'force-dynamic' en todos los POST handlers\n- Leer el archivo COMPLETO antes de editarlo (nunca editar a ciegas)\n\n## Comunicación\n\n- Respondo en español (el idioma del equipo)\n- Explico el razonamiento antes de los cambios\n- Enumero riesgos o efectos secundarios\n- Si algo es ambiguo, pregunto antes de asumir\n- NO doy vueltas: si la pregunta es de datos, ejecuto el query de inmediato`;
}

// ─── Tool schemas ─────────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_code',
    description: 'Semantic search through the Menius SOURCE CODE. Use ONLY for questions about how the code works, which file implements something, or before editing a file. DO NOT use for questions about production data (orders, users, stores, revenue) — use query_database or query_stripe instead.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to search for in the codebase' }, limit: { type: 'number', description: 'Max results (default 5)' } }, required: ['query'] },
  },
  {
    name: 'read_file',
    description: 'Read a source file from the GitHub repo. Always read the full file before editing it.',
    input_schema: { type: 'object' as const, properties: { path: { type: 'string', description: 'e.g. src/app/api/orders/route.ts' } }, required: ['path'] },
  },
  {
    name: 'list_files',
    description: 'List files in a directory of the repo. Use to explore the code structure, not for production data.',
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
    name: 're_run_vercel_build',
    description: 'Triggers a new Vercel deployment for the project. Use to re-run a build for the project.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
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
    description: 'Run a read-only SELECT on the Supabase PRODUCTION database. Use this FIRST for any question about real data: registered stores/restaurants, orders, users, subscriptions, products, categories. Tables: restaurants, orders, order_items, profiles, products, categories, restaurant_subscriptions. Example: SELECT name, slug, created_at FROM restaurants WHERE created_at >= NOW() - INTERVAL \'7 days\' ORDER BY created_at DESC',
    input_schema: { type: 'object' as const, properties: { sql: { type: 'string', description: 'SELECT query (read-only). Always use LIMIT to avoid large payloads.' } }, required: ['sql'] },
  },
  {
    name: 'write_database',
    description: 'Write (insert/update/delete) a row in the Supabase database. Allowed tables: restaurants, products, categories, restaurant_hours, dev_alerts. Use for fixing data issues, updating store settings, or managing content. Always confirm with user before deleting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Table name' },
        action: { type: 'string', enum: ['insert', 'update', 'delete'] },
        row: { type: 'object', description: 'Row data as key-value pairs' },
        matchColumn: { type: 'string', description: 'Column to match for update/delete (e.g. "id", "slug")' },
      },
      required: ['table', 'action', 'row'],
    },
  },
  {
    name: 'get_schema',
    description: 'Get the full Supabase database schema: all tables and their columns with types. Use when you need to understand the DB structure before writing queries or code.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'rollback_vercel',
    description: 'Rollback Vercel production to a previous successful deployment. Use when deploy fails or user asks to rollback. Provide the deployment ID to rollback to (from the deploy list).',
    input_schema: {
      type: 'object' as const,
      properties: {
        deploymentId: { type: 'string', description: 'Vercel deployment UID to promote to production (e.g. dpl_xxx). If unsure, use "previous" to auto-find the last good deploy.' },
        reason: { type: 'string', description: 'Why are we rolling back?' },
      },
      required: ['deploymentId'],
    },
  },
  {
    name: 'get_vercel_env',
    description: 'List all environment variables configured in Vercel for this project. Use when debugging missing env vars or checking configuration.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_vercel_logs',
    description: 'Get function logs from the latest Vercel production deployment. Use when debugging runtime errors, slow functions, or checking what happened during a recent deploy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        functionPath: { type: 'string', description: 'Optional: specific API route path to filter logs, e.g. /api/orders' },
      },
      required: [],
    },
  },
  {
    name: 'query_stripe',
    description: 'Query Stripe for BUSINESS METRICS: revenue, MRR, subscriptions, customers, payment failures. Use for financial and billing questions.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to query: e.g. "revenue this month", "active subscriptions", "recent customers"' } }, required: ['query'] },
  },
  {
    name: 'get_sentry_errors',
    description: 'Get unresolved errors from Sentry production monitoring. Use when investigating production bugs, crashes, or when the user mentions errors they are seeing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Number of issues to retrieve (default 10, max 25)' },
      },
      required: [],
    },
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
  'openai/o3', 'openai/o3-mini', 'openai/o4-mini',
  'openai/gpt-4.5',
  'openai/gpt-4o', 'openai/gpt-4o-mini',
  'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout',
  'openrouter/google/gemini-2.5-pro', 'mistralai/mistral-large',
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
    case 'write_database':
      return { result: await writeDB(inp.table as string, inp.row as Record<string, unknown>, inp.action as 'insert' | 'update' | 'delete', inp.matchColumn as string | undefined, db) };
    case 'get_schema':
      return { result: await getSupabaseSchema(db) };
    case 'rollback_vercel':
      return { result: await rollbackVercel(inp.deploymentId as string, inp.reason as string | undefined) };

    case 're_run_vercel_build':
      send('tool_code', { code: 'A new Vercel deployment has been triggered.' }); // Frontend notification
      const reRunResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/dev/re-run-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!reRunResponse.ok) {
        const errorJson = await reRunResponse.json();
        return { result: `Error re-triggering deployment: ${errorJson.error}` };
      }
      return { result: 'Vercel deployment re-triggered successfully.' };

    case 'get_vercel_env':
      return { result: await getVercelEnvVars() };
    case 'get_vercel_logs':
      return { result: await getVercelFunctionLogs(inp.functionPath as string | undefined) };
    case 'query_stripe':
      return { result: await queryStripe(inp.query as string) };
    case 'get_sentry_errors':
      return { result: await getSentryErrors(Math.min((inp.limit as number) ?? 10, 25)) };
    default:
      return { result: `Unknown tool: ${name}` };
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
    recentConvSummaries = [],
    activeFile, // New: active file from frontend
  } = body as {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    images?: string[];
    thinking?: boolean;
    recentConvSummaries?: string[];
    activeFile?: { path: string; content: string };
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

      // --- Pre-context Deep Linking (AI auto-reads related files) ---
      const initialMessages = [...messages];
      if (activeFile && activeFile.path && initialMessages.length > 0) {
        // Find the last user message to prepend context to
        const lastUserMsgIndex = initialMessages.findLastIndex(m => m.role === 'user');
        if (lastUserMsgIndex !== -1) {
          const relatedFiles = await getRelatedFiles(activeFile.path, activeFile.content, githubToken);
          if (relatedFiles.length > 0) {
            const contextString = relatedFiles.map(f =>
              `[Contexto de archivo relacionado: ${f.path}]\n\`\`\`\n${f.content}\n\`\`\``
            ).join('\n\n');

            initialMessages[lastUserMsgIndex].content =
              `${contextString}\n\n${initialMessages[lastUserMsgIndex].content}`;
            send('context_inject', { paths: relatedFiles.map(f => f.path) });
          }
        }
      }
      // --- End Pre-context Deep Linking ---

      if (isOpenRouterModel(resolvedModel)) {
        if (!openrouterKey) {
          send('error', { message: 'Missing OPENROUTER_API_KEY. Add it in Vercel env vars.' });
          controller.close();
          return;
        }
        try {
          await runOpenRouterStream(
            resolvedModel, buildSystemPrompt(recentConvSummaries), initialMessages, lastUserImages,
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
        const anthropicMessages = buildAnthropicMessages(initialMessages, lastUserImages);
        let currentMessages = [...anthropicMessages] as Anthropic.MessageParam[];
        const pendingChanges: PendingChange[] = [];
        const MAX_ROUNDS = 10;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const ANTHROPIC_MAX_ROUNDS = 8;

        const ROUND_TIMEOUT_MS = 55_000; // 55s per round (Vercel max is 120s total)
        let roundsStuck = 0;
        const lastToolNames: string[] = [];

        for (let round = 0; round < ANTHROPIC_MAX_ROUNDS; round++) {
          const contentBlocks: Anthropic.ContentBlock[] = [];
          let currentTextBlock = '';
          let currentToolUse: Anthropic.ToolUseBlock | null = null;
          let toolInputJson = '';

          const streamParams: Parameters<typeof client.messages.stream>[0] = {
            model: resolvedModel,
            max_tokens: thinkingMode ? 16000 : 8192,
            system: buildSystemPrompt(recentConvSummaries),
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

          // Detect stuck: same tool called 3+ times in a row
          const currentToolNames = toolUseBlocks.map(t => t.name).join(',');
          if (lastToolNames.length >= 2 && lastToolNames.slice(-2).every(n => n === currentToolNames)) {
            roundsStuck++;
            if (roundsStuck >= 2) {
              send('token', { text: '\n\n⚠️ *El AI detectó que está en un loop. Deteniendo para evitar consumo innecesario. Por favor, reformula la pregunta con más contexto específico.*' });
              break;
            }
          } else {
            roundsStuck = 0;
          }
          lastToolNames.push(currentToolNames);

          currentMessages.push({ role: 'assistant', content: contentBlocks });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          const roundStart = Date.now();

          for (const toolUse of toolUseBlocks) {
            // Check overall round timeout
            if (Date.now() - roundStart > ROUND_TIMEOUT_MS) {
              send('token', { text: '\n\n⏱️ *Tiempo límite de respuesta alcanzado. El AI tuvo que detenerse. Intenta una pregunta más específica.*' });
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Timeout reached — stopping.' });
              break;
            }
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

          // Warn if approaching limit
          if (round === ANTHROPIC_MAX_ROUNDS - 2) {
            send('token', { text: '\n\n⚠️ *Alcanzando límite de iteraciones — resumiendo resultado…*\n\n' });
          }
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
