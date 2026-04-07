export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO  = 'menius';
const GITHUB_BRANCH = 'main';
const VOYAGE_API = 'https://api.voyageai.com/v1';

// ─── Helpers (duplicated here to keep this route self-contained) ──────────────
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
  if (!rows?.length) return 'No results found.';

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
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: tavilyKey, query, search_depth: 'advanced', max_results: 5, include_answer: true }),
  });
  if (!res.ok) throw new Error(`Tavily: ${res.status}`);
  const json = await res.json();
  const parts: string[] = [];
  if (json.answer) parts.push(`**Answer**: ${json.answer}`);
  for (const r of (json.results ?? []).slice(0, 5)) {
    parts.push(`**${r.title}** (${r.url})\n${r.content?.slice(0, 500) ?? ''}`);
  }
  return parts.join('\n\n') || 'No results.';
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

### Al escribir código:
- Cambios QUIRÚRGICOS — mínimos y precisos. No tocar lo que no es necesario.
- TypeScript strict — NO any, tipos explícitos
- Sin comentarios que explican lo obvio ("// Import X", "// Define function")
- Imports siempre al tope del archivo
- Respetar los patrones existentes del archivo (no inventar nuevos patrones)
- Siempre usar createAdminClient() en route handlers que requieren bypass de RLS
- export const dynamic = 'force-dynamic' en todos los POST handlers

### Seguridad:
- NUNCA exponer service role key en cliente
- NUNCA hacer queries sin autenticación en datos sensibles
- Validar todos los inputs con Zod o checks manuales
- Rate limiting en endpoints públicos

### Base de datos:
- NUNCA editar migraciones existentes — crear archivo nuevo
- plan_id en DB solo acepta: starter | pro | business (nunca 'free')
- FK de order_item_modifiers deben existir en modifier_groups/options
- revalidateTag(\`menu-data:\${slug}\`) después de cambios al menú

### Para investigaciones, market research, tendencias:
- Usa search_web para buscar información actualizada
- Puedo investigar cualquier tema: tecnología, mercado, competidores, best practices
- No limitado solo al código — soy un asistente completo

### Comunicación:
- Respondo en español (el idioma del equipo)
- Explico el razonamiento antes de los cambios
- Enumero riesgos o efectos secundarios
- Si algo es ambiguo, pregunto antes de asumir`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_code',
    description: 'Semantic search through the Menius codebase. Results are AI-reranked.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
  },
  {
    name: 'read_file',
    description: 'Read a file from the GitHub repo.',
    input_schema: { type: 'object' as const, properties: { path: { type: 'string', description: 'e.g. src/app/api/orders/route.ts' } }, required: ['path'] },
  },
  {
    name: 'list_files',
    description: 'List files in a directory.',
    input_schema: { type: 'object' as const, properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'search_web',
    description: 'Search the internet for docs and solutions.',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'write_file',
    description: 'Propose a file change. Provide COMPLETE file content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        explanation: { type: 'string' },
      },
      required: ['path', 'content', 'action'],
    },
  },
  {
    name: 'query_database',
    description: 'Run a read-only SELECT on the Supabase production DB.',
    input_schema: { type: 'object' as const, properties: { sql: { type: 'string' } }, required: ['sql'] },
  },
];

// ─── OpenAI-compatible tools (for OpenRouter) ────────────────────────────────
const OPENAI_TOOLS = [
  { type: 'function', function: { name: 'search_code', description: 'Semantic search through the Menius codebase. Results are AI-reranked.', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'read_file', description: 'Read a file from the GitHub repo.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'e.g. src/app/api/orders/route.ts' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'list_files', description: 'List files in a directory.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'search_web', description: 'Search the internet for docs, trends, market research, and solutions.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'write_file', description: 'Propose a file change. Provide COMPLETE file content.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, action: { type: 'string', enum: ['create', 'update', 'delete'] }, explanation: { type: 'string' } }, required: ['path', 'content', 'action'] } } },
  { type: 'function', function: { name: 'query_database', description: 'Run a read-only SELECT on the Supabase production DB.', parameters: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] } } },
];

const OPENROUTER_MODEL_IDS = new Set([
  'openai/o3', 'openai/o3-mini', 'openai/o4-mini', 'openai/gpt-4.5',
  'openai/gpt-4o', 'openai/gpt-4o-mini',
  'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout',
  'google/gemini-2.5-pro', 'mistralai/mistral-large',
]);

function isOpenRouterModel(modelId: string): boolean {
  return modelId.includes('/') || OPENROUTER_MODEL_IDS.has(modelId);
}

// ─── OpenRouter agentic stream loop ──────────────────────────────────────────
type PendingChange = { path: string; content: string; action: string; explanation?: string };

async function runOpenRouterStream(
  modelId: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
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

  type OAIMessage = Record<string, unknown>;
  const currentMessages: OAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
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
    const hasToolCalls = toolCallList.length > 0;

    if (hasToolCalls) {
      currentMessages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCallList.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } })),
      });

      for (const tc of toolCallList) {
        let result = '';
        let pendingChange: PendingChange | undefined;
        try {
          send('tool_running', { name: tc.name });
          const inp = JSON.parse(tc.arguments || '{}') as Record<string, unknown>;
          switch (tc.name) {
            case 'search_code': result = await searchCode(inp.query as string, Math.min((inp.limit as number) ?? 5, 10), voyageKey, db); break;
            case 'read_file': result = `\`\`\`\n${(await readFileGH(inp.path as string, githubToken)).slice(0, 8000)}\n\`\`\``; break;
            case 'list_files': result = await listFiles(inp.path as string, githubToken); break;
            case 'search_web': result = await searchWebTavily(inp.query as string, tavilyKey); break;
            case 'write_file':
              pendingChange = { path: inp.path as string, content: inp.content as string, action: (inp.action as string) ?? 'update', explanation: inp.explanation as string | undefined };
              result = `File change prepared: ${pendingChange.action} ${pendingChange.path}`;
              send('pending_change', pendingChange);
              break;
            case 'query_database': result = await queryDB(inp.sql as string, db); break;
            default: result = `Unknown tool: ${tc.name}`;
          }
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

// ─── SSE encoder ─────────────────────────────────────────────────────────────
function sseEvent(type: string, data: object): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) {
    return new Response('Unauthorized', { status: 403 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const voyageKey   = process.env.VOYAGE_API_KEY ?? '';
  const tavilyKey   = process.env.TAVILY_API_KEY ?? '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? '';

  if (!anthropicKey || !githubToken) {
    return new Response('Missing env vars', { status: 500 });
  }

  const body = await request.json();
  const { messages, model } = body as { messages: Array<{ role: string; content: string }>; model?: string };

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

      // Route OpenRouter models to the separate handler
      if (isOpenRouterModel(resolvedModel)) {
        if (!openrouterKey) {
          send('error', { message: 'Missing OPENROUTER_API_KEY. Add it in Vercel env vars.' });
          controller.close();
          return;
        }
        try {
          await runOpenRouterStream(resolvedModel, buildSystemPrompt(), messages, githubToken, voyageKey, tavilyKey, db, openrouterKey, send);
          send('done', { pendingChanges: [] });
        } catch (err) {
          send('error', { message: err instanceof Error ? err.message : 'OpenRouter error' });
        }
        controller.close();
        return;
      }

      try {
        let currentMessages = [...messages] as Anthropic.MessageParam[];
        const pendingChanges: Array<{ path: string; content: string; action: string; explanation?: string }> = [];
        const MAX_ROUNDS = 10;

        for (let round = 0; round < MAX_ROUNDS; round++) {
          // Stream this round
          let roundText = '';

          const anthropicStream = await client.messages.stream({
            model: resolvedModel,
            max_tokens: 8192,
            system: buildSystemPrompt(),
            tools: TOOLS,
            messages: currentMessages,
          });

          // Collect content blocks while streaming tokens
          const contentBlocks: Anthropic.ContentBlock[] = [];
          let currentTextBlock = '';
          let currentToolUse: Anthropic.ToolUseBlock | null = null;
          let toolInputJson = '';

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
                roundText += chunk.delta.text;
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
                try {
                  currentToolUse.input = JSON.parse(toolInputJson || '{}');
                } catch {
                  currentToolUse.input = {};
                }
                contentBlocks.push(currentToolUse);
                currentToolUse = null;
                toolInputJson = '';
              }
            }
          }

          const finalMessage = await anthropicStream.finalMessage();

          // If no tool use, done
          if (finalMessage.stop_reason !== 'tool_use') break;

          const toolUseBlocks = contentBlocks.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
          if (!toolUseBlocks.length) break;

          currentMessages.push({ role: 'assistant', content: contentBlocks });

          // Execute tools
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of toolUseBlocks) {
            const inp = toolUse.input as Record<string, unknown>;
            let result = '';
            let pendingChange: { path: string; content: string; action: string; explanation?: string } | undefined;

            try {
              send('tool_running', { name: toolUse.name });

              switch (toolUse.name) {
                case 'search_code':
                  result = await searchCode(inp.query as string, Math.min((inp.limit as number) ?? 5, 10), voyageKey, db);
                  break;
                case 'read_file':
                  result = `\`\`\`\n${(await readFileGH(inp.path as string, githubToken)).slice(0, 8000)}\n\`\`\``;
                  break;
                case 'list_files':
                  result = await listFiles(inp.path as string, githubToken);
                  break;
                case 'search_web':
                  result = await searchWebTavily(inp.query as string, tavilyKey);
                  break;
                case 'write_file':
                  pendingChange = {
                    path: inp.path as string,
                    content: inp.content as string,
                    action: (inp.action as string) ?? 'update',
                    explanation: inp.explanation as string | undefined,
                  };
                  pendingChanges.push(pendingChange);
                  result = `File change prepared: ${pendingChange.action} ${pendingChange.path}`;
                  send('pending_change', pendingChange);
                  break;
                case 'query_database':
                  result = await queryDB(inp.sql as string, db);
                  break;
                default:
                  result = `Unknown tool: ${toolUse.name}`;
              }

              send('tool_done', { name: toolUse.name, resultLength: result.length });
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`;
              send('tool_error', { name: toolUse.name, error: result });
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result.slice(0, 50000),
            });
          }

          currentMessages.push({ role: 'user', content: toolResults });
        }

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
