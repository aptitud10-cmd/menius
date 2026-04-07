export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from '@google/generative-ai';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('dev-chat');

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';
const GITHUB_BRANCH = 'main';
const VOYAGE_API = 'https://api.voyageai.com/v1';

// ─── Model routing ────────────────────────────────────────────────────────────
type Provider = 'anthropic' | 'gemini';

interface ModelConfig {
  provider: Provider;
  modelId: string;
  label: string;
}

const MODELS: Record<string, ModelConfig> = {
  'claude-opus-4-5':         { provider: 'anthropic', modelId: 'claude-opus-4-5',           label: 'Claude Opus 4.5' },
  'claude-sonnet-4-5':       { provider: 'anthropic', modelId: 'claude-sonnet-4-5',          label: 'Claude Sonnet 4.5' },
  'claude-haiku-3-5':        { provider: 'anthropic', modelId: 'claude-haiku-3-5',           label: 'Claude Haiku 3.5' },
  'gemini-2.5-pro':          { provider: 'gemini',    modelId: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro' },
  'gemini-2.5-flash':        { provider: 'gemini',    modelId: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash' },
  // Short aliases
  'opus':   { provider: 'anthropic', modelId: 'claude-opus-4-5',    label: 'Claude Opus 4.5' },
  'sonnet': { provider: 'anthropic', modelId: 'claude-sonnet-4-5',  label: 'Claude Sonnet 4.5' },
  'haiku':  { provider: 'anthropic', modelId: 'claude-haiku-3-5',   label: 'Claude Haiku 3.5' },
};

function resolveModel(model?: string): ModelConfig {
  if (!model) return MODELS['claude-sonnet-4-5'];
  return MODELS[model] ?? MODELS['claude-sonnet-4-5'];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function githubFetch(apiPath: string, token: string) {
  const res = await fetch(`https://api.github.com/${apiPath}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error(`GitHub ${apiPath}: ${res.status}`);
  return res.json();
}

async function readFileFromGitHub(filePath: string, token: string): Promise<string> {
  const data = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
    token
  );
  if (data.encoding === 'base64') return Buffer.from(data.content, 'base64').toString('utf-8');
  return data.content ?? '';
}

async function searchCodeEmbeddings(query: string, limit: number, voyageKey: string, db: ReturnType<typeof createAdminClient>): Promise<string> {
  const embedRes = await fetch(`${VOYAGE_API}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'voyage-code-3', input: [query], input_type: 'query' }),
  });
  if (!embedRes.ok) throw new Error(`Voyage embed: ${embedRes.status}`);
  const embedJson = await embedRes.json();
  const embedding = embedJson.data[0].embedding;

  const { data: rows, error } = await db.rpc('search_code_embeddings', {
    query_embedding: JSON.stringify(embedding),
    match_count: Math.min(limit * 2, 40),
  });
  if (error) throw new Error(`pgvector search: ${error.message}`);
  if (!rows?.length) return 'No results found in the codebase index.';

  const documents = rows.map((r: { content: string }) => r.content);
  const rerankRes = await fetch(`${VOYAGE_API}/rerank`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'rerank-2', query, documents, top_k: Math.min(limit, 10), return_documents: false }),
  });

  let topIndices: number[];
  if (rerankRes.ok) {
    const rerankJson = await rerankRes.json();
    topIndices = (rerankJson.data ?? []).map((r: { index: number }) => r.index);
  } else {
    topIndices = rows.slice(0, limit).map((_: unknown, i: number) => i);
  }

  return topIndices
    .map(i => {
      const r = rows[i] as { file_path: string; content: string };
      return `### ${r.file_path}\n\`\`\`\n${r.content.slice(0, 3000)}\n\`\`\``;
    })
    .join('\n\n');
}

async function searchWeb(query: string, tavilyKey: string): Promise<string> {
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
  return parts.join('\n\n') || 'No web results found.';
}

async function listFiles(dirPath: string, token: string): Promise<string> {
  try {
    const data = await githubFetch(
      `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${dirPath}?ref=${GITHUB_BRANCH}`,
      token
    );
    if (!Array.isArray(data)) return JSON.stringify(data);
    return data
      .map((f: { name: string; type: string; size?: number }) =>
        `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size}b)` : ''}`
      )
      .join('\n');
  } catch (err) {
    return `Error listing ${dirPath}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function queryDatabase(sql: string, db: ReturnType<typeof createAdminClient>): Promise<string> {
  // Safety: only allow SELECT statements
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    return 'Error: Only SELECT queries are allowed for safety.';
  }
  // Block dangerous keywords
  const dangerous = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
  if (dangerous.some(kw => trimmed.includes(kw))) {
    return 'Error: Query contains restricted keywords.';
  }

  try {
    const { data, error } = await db.rpc('exec_readonly_sql', { sql_query: sql }).limit ? 
      await (db as ReturnType<typeof createAdminClient>).rpc('exec_readonly_sql', { sql_query: sql }) :
      { data: null, error: { message: 'RPC not available' } };
    
    if (error) {
      // Fallback: try direct query parsing for simple cases
      return `SQL query logged (direct execution requires exec_readonly_sql RPC). Query:\n\`\`\`sql\n${sql}\n\`\`\`\n\nTo enable DB queries, run this in Supabase SQL editor:\n\`\`\`sql\nCREATE OR REPLACE FUNCTION exec_readonly_sql(sql_query text)\nRETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$\nDECLARE result jsonb;\nBEGIN\n  EXECUTE 'SET LOCAL statement_timeout = ''5s''; SET LOCAL transaction_read_only = on;';\n  EXECUTE sql_query INTO result;\n  RETURN result;\nEXCEPTION WHEN OTHERS THEN\n  RETURN jsonb_build_object(''error'', SQLERRM);\nEND; $$;\`\`\``;
    }
    return JSON.stringify(data, null, 2).slice(0, 5000);
  } catch (err) {
    return `DB Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function getSentryErrors(sentryToken: string, orgSlug: string, projectSlug: string, limit: number): Promise<string> {
  const res = await fetch(
    `https://sentry.io/api/0/projects/${orgSlug}/${projectSlug}/issues/?limit=${limit}&query=is:unresolved&sort=date`,
    {
      headers: { Authorization: `Bearer ${sentryToken}`, 'Content-Type': 'application/json' },
    }
  );
  if (!res.ok) {
    return `Sentry API error: ${res.status}. Make sure SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT are set.`;
  }
  const issues = await res.json();
  if (!issues?.length) return 'No unresolved Sentry issues found.';

  return issues
    .slice(0, limit)
    .map((issue: {
      id: string;
      title: string;
      culprit: string;
      count: string;
      userCount: number;
      firstSeen: string;
      lastSeen: string;
      permalink: string;
    }) => [
      `**${issue.title}**`,
      `  Culprit: ${issue.culprit}`,
      `  Occurrences: ${issue.count} | Users affected: ${issue.userCount}`,
      `  First seen: ${issue.firstSeen} | Last seen: ${issue.lastSeen}`,
      `  URL: ${issue.permalink}`,
    ].join('\n'))
    .join('\n\n');
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  let claudeMd = '';
  try {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
    }
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
6. **get_sentry_errors** para investigar errores de producción

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
- Puedo investigar cualquier tema: tecnología, mercado, competidores, best practices
- No limitado solo al código — soy un asistente completo

### Comunicación:
- Respondo en español (el idioma del equipo)
- Explico el razonamiento antes de los cambios
- Enumero riesgos o efectos secundarios
- Si algo es ambiguo, pregunto antes de asumir

## Code Quality Rules
- TypeScript strict — no any unless absolutely necessary
- No comments that just narrate what the code does
- Imports always at top of file
- Route handlers thin — business logic in separate functions
- Error handling: throw for exceptional, return null for expected missing
- Never use Date.now() in Supabase queries

Always prefer surgical, minimal changes. Never rewrite things that work.`;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_code',
    description: 'Semantic search through the Menius codebase. Results are reranked by AI for relevance.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Natural language description of what you are looking for' },
        limit: { type: 'number', description: 'Max results (default: 5, max: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the complete content of a file from the repository.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to repo root, e.g. src/app/api/orders/route.ts' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and folders in a directory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Directory path relative to repo root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the internet for documentation, error solutions, or best practices.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'write_file',
    description: 'Propose changes to a file. Shown to user with diff viewer before applying. Provide COMPLETE file content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        content: { type: 'string', description: 'Complete new file content' },
        action: { type: 'string', enum: ['create', 'update', 'delete'], description: 'create | update | delete' },
        explanation: { type: 'string', description: 'Why this change is needed' },
      },
      required: ['path', 'content', 'action'],
    },
  },
  {
    name: 'query_database',
    description: 'Run a read-only SELECT query against the Supabase production database. Use to diagnose data issues, check restaurant configs, inspect orders, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: { type: 'string', description: 'SQL SELECT query. Only SELECT/WITH statements allowed.' },
      },
      required: ['sql'],
    },
  },
  {
    name: 'get_sentry_errors',
    description: 'Get unresolved production errors from Sentry. Use when diagnosing production bugs or when the user mentions an error they saw.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Number of issues to fetch (default: 10, max: 25)' },
      },
      required: [],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  githubToken: string,
  voyageKey: string,
  tavilyKey: string,
  db: ReturnType<typeof createAdminClient>
): Promise<{ result: string; pendingChange?: { path: string; content: string; action: string; explanation?: string } }> {
  switch (toolName) {
    case 'search_code': {
      const query = input.query as string;
      const limit = Math.min((input.limit as number) ?? 5, 10);
      const result = await searchCodeEmbeddings(query, limit, voyageKey, db);
      return { result };
    }
    case 'read_file': {
      const filePath = input.path as string;
      const content = await readFileFromGitHub(filePath, githubToken);
      return { result: `\`\`\`\n${content.slice(0, 8000)}\n\`\`\`` };
    }
    case 'list_files': {
      const dirPath = input.path as string;
      const result = await listFiles(dirPath, githubToken);
      return { result };
    }
    case 'search_web': {
      const query = input.query as string;
      const result = await searchWeb(query, tavilyKey);
      return { result };
    }
    case 'write_file': {
      const filePath = input.path as string;
      const content = input.content as string;
      const action = (input.action as string) ?? 'update';
      const explanation = input.explanation as string | undefined;
      return {
        result: `File change prepared: ${action} ${filePath}`,
        pendingChange: { path: filePath, content, action, explanation },
      };
    }
    case 'query_database': {
      const sql = input.sql as string;
      const result = await queryDatabase(sql, db);
      return { result };
    }
    case 'get_sentry_errors': {
      const sentryToken = process.env.SENTRY_AUTH_TOKEN ?? '';
      const orgSlug = process.env.SENTRY_ORG ?? '';
      const projectSlug = process.env.SENTRY_PROJECT ?? '';
      const limit = Math.min((input.limit as number) ?? 10, 25);
      const result = await getSentryErrors(sentryToken, orgSlug, projectSlug, limit);
      return { result };
    }
    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

// ─── Gemini agentic loop ───────────────────────────────────────────────────────
interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

async function runGeminiAgentLoop(
  geminiModel: string,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  githubToken: string,
  voyageKey: string,
  tavilyKey: string,
  db: ReturnType<typeof createAdminClient>,
  geminiKey: string
): Promise<{ finalText: string; pendingChanges: Array<{ path: string; content: string; action: string; explanation?: string }> }> {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  // Convert messages to Gemini format
  const history: GeminiMessage[] = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
  }));

  const lastUserMsg = messages[messages.length - 1];
  const lastText = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg.content);

  const chat = model.startChat({
    history,
    systemInstruction: systemPrompt,
    tools: [
      {
        functionDeclarations: TOOLS.map(t => ({
          name: t.name,
          description: t.description,
          parameters: {
            type: SchemaType.OBJECT,
            properties: Object.fromEntries(
              Object.entries(t.input_schema.properties ?? {}).map(([k, v]) => [
                k,
                { type: SchemaType.STRING, description: (v as { description?: string }).description ?? '' },
              ])
            ),
            required: (t.input_schema as { required?: string[] }).required ?? [],
          },
        })),
      },
    ],
  });

  let finalText = '';
  const pendingChanges: Array<{ path: string; content: string; action: string; explanation?: string }> = [];
  const MAX_ROUNDS = 10;

  let currentMsg = lastText;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = await chat.sendMessage(currentMsg);
    const response = result.response;
    const candidate = response.candidates?.[0];
    if (!candidate) break;

    // Collect text
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) finalText += part.text;
    }

    // Check for function calls
    const fnCalls = (candidate.content?.parts ?? []).filter(p => p.functionCall);
    if (!fnCalls.length) break;

    // Execute all function calls
    const fnResponses: string[] = [];
    for (const part of fnCalls) {
      if (!part.functionCall) continue;
      try {
        const { result: toolResult, pendingChange } = await executeTool(
          part.functionCall.name,
          (part.functionCall.args ?? {}) as Record<string, unknown>,
          githubToken,
          voyageKey,
          tavilyKey,
          db
        );
        if (pendingChange) pendingChanges.push(pendingChange);
        fnResponses.push(`[${part.functionCall.name}]: ${toolResult.slice(0, 10000)}`);
      } catch (err) {
        fnResponses.push(`[${part.functionCall.name} ERROR]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    currentMsg = fnResponses.join('\n\n');
  }

  return { finalText, pendingChanges };
}

// ─── Main POST route ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const githubToken = process.env.GITHUB_TOKEN;
    const voyageKey = process.env.VOYAGE_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!anthropicKey && !geminiKey) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY or GEMINI_API_KEY' }, { status: 500 });
    }
    if (!githubToken) return NextResponse.json({ error: 'Missing GITHUB_TOKEN' }, { status: 500 });

    const body = await request.json();
    const { messages, model, conversationId, saveHistory } = body as {
      messages: Anthropic.MessageParam[];
      model?: string;
      conversationId?: string;
      saveHistory?: boolean;
    };

    if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

    const db = createAdminClient();
    const modelConfig = resolveModel(model);

    // Pure save — skip AI loop entirely
    if (saveHistory && conversationId) {
      await db.from('dev_conversations').upsert({
        id: conversationId,
        user_id: 'admin',
        messages: JSON.stringify(messages),
        model: modelConfig.modelId,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    const systemPrompt = buildSystemPrompt();

    let finalText = '';
    let pendingChanges: Array<{ path: string; content: string; action: string; explanation?: string }> = [];

    if (modelConfig.provider === 'gemini') {
      if (!geminiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
      const result = await runGeminiAgentLoop(
        modelConfig.modelId,
        systemPrompt,
        messages,
        githubToken,
        voyageKey ?? '',
        tavilyKey ?? '',
        db,
        geminiKey
      );
      finalText = result.finalText;
      pendingChanges = result.pendingChanges;
    } else {
      // Anthropic agentic loop
      if (!anthropicKey) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
      const client = new Anthropic({ apiKey: anthropicKey });
      let currentMessages = [...messages];
      const MAX_ROUNDS = 10;

      const availableTools = voyageKey
        ? TOOLS
        : TOOLS.filter(t => t.name !== 'search_code');

      for (let round = 0; round < MAX_ROUNDS; round++) {
        const response = await client.messages.create({
          model: modelConfig.modelId,
          max_tokens: 8192,
          system: systemPrompt,
          tools: availableTools,
          messages: currentMessages,
        });

        for (const block of response.content) {
          if (block.type === 'text') finalText += block.text;
        }

        if (response.stop_reason !== 'tool_use') break;

        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
        if (!toolUseBlocks.length) break;

        currentMessages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          try {
            const { result, pendingChange } = await executeTool(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
              githubToken,
              voyageKey ?? '',
              tavilyKey ?? '',
              db
            );
            if (pendingChange) pendingChanges.push(pendingChange);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result.slice(0, 50000),
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${msg}`, is_error: true });
          }
        }

        currentMessages.push({ role: 'user', content: toolResults });
      }
    }

    // Save conversation history
    if (saveHistory && conversationId) {
      const allMessages = [...messages];
      if (finalText) allMessages.push({ role: 'assistant', content: finalText });
      await db.from('dev_conversations').upsert({
        id: conversationId,
        user_id: 'admin',
        messages: JSON.stringify(allMessages),
        model: modelConfig.modelId,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      content: finalText,
      pendingChanges,
      model: modelConfig.modelId,
      provider: modelConfig.provider,
    });
  } catch (err) {
    logger.error('dev chat POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

// ─── GET: conversation history ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const db = createAdminClient();
    const conversationId = request.nextUrl.searchParams.get('id');

    if (conversationId) {
      const { data } = await db.from('dev_conversations').select('*').eq('id', conversationId).single();
      return NextResponse.json({ conversation: data });
    }

    const { data } = await db
      .from('dev_conversations')
      .select('id, title, model, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ conversations: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// ─── PUT: rename conversation ───────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const db = createAdminClient();
    const { id, title } = await request.json() as { id?: string; title?: string };
    if (!id || !title) return NextResponse.json({ error: 'id and title required' }, { status: 400 });

    await db.from('dev_conversations').update({ title }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// ─── DELETE: remove conversation ───────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const db = createAdminClient();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await db.from('dev_conversations').delete().eq('id', id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
