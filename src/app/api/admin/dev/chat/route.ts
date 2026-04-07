export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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

// ─── Model map ───────────────────────────────────────────────────────────────
const MODEL_MAP: Record<string, string> = {
  'opus':    'claude-opus-4-5',
  'sonnet':  'claude-sonnet-4-5',
  'haiku':   'claude-haiku-3-5',
  'gemini-pro':   'claude-sonnet-4-5',  // fallback: use claude if no gemini integration
  'gemini-flash': 'claude-haiku-3-5',
  // Full model IDs pass through
};

function resolveModel(model?: string): string {
  if (!model) return 'claude-sonnet-4-5';
  return MODEL_MAP[model] ?? model;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function githubFetch(apiPath: string, token: string) {
  const res = await fetch(`https://api.github.com/${apiPath}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub ${apiPath}: ${res.status}`);
  return res.json();
}

async function readFileFromGitHub(filePath: string, token: string): Promise<string> {
  const data = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
    token
  );
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return data.content ?? '';
}

async function searchCodeEmbeddings(query: string, limit: number, voyageKey: string, db: ReturnType<typeof createAdminClient>): Promise<string> {
  // 1. Embed the query
  const embedRes = await fetch(`${VOYAGE_API}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'voyage-code-3', input: [query], input_type: 'query' }),
  });
  if (!embedRes.ok) throw new Error(`Voyage embed: ${embedRes.status}`);
  const embedJson = await embedRes.json();
  const embedding = embedJson.data[0].embedding;

  // 2. Search pgvector
  const { data: rows, error } = await db.rpc('search_code_embeddings', {
    query_embedding: JSON.stringify(embedding),
    match_count: Math.min(limit * 2, 40), // fetch extra for reranking
  });
  if (error) throw new Error(`pgvector search: ${error.message}`);
  if (!rows?.length) return 'No results found in the codebase index.';

  // 3. Rerank with Voyage
  const documents = rows.map((r: { content: string }) => r.content);
  const rerankRes = await fetch(`${VOYAGE_API}/rerank`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'rerank-2',
      query,
      documents,
      top_k: Math.min(limit, 10),
      return_documents: false,
    }),
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
      const r = rows[i] as { file_path: string; content: string; similarity: number };
      return `### ${r.file_path}\n\`\`\`\n${r.content.slice(0, 3000)}\n\`\`\``;
    })
    .join('\n\n');
}

async function searchWeb(query: string, tavilyKey: string): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: 'advanced',
      max_results: 5,
      include_answer: true,
    }),
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

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  let claudeMd = '';
  try {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
    }
  } catch { /* ignore */ }

  return `You are an expert software engineer working on the Menius codebase — a Next.js 14 SaaS platform for restaurants in Latin America. You have the same capabilities as Cursor AI: you can read files, search the codebase semantically, search the web, write code changes, and apply them directly to the repository.

${claudeMd ? `## Project Context (CLAUDE.md)\n${claudeMd}` : ''}

## Your Capabilities
- **search_code**: Semantic search through the entire codebase using vector embeddings
- **read_file**: Read any file from the GitHub repository  
- **list_files**: Browse directory contents
- **search_web**: Search the internet for documentation, solutions, best practices
- **write_file**: Propose file changes (shown to user with diff viewer before applying)

## How to Respond
1. When asked to fix a bug or add a feature: first **search_code** to find relevant files, then **read_file** to understand context, then propose precise changes using **write_file**.
2. Always show your reasoning step by step.
3. When proposing code changes, explain WHY each change is needed.
4. When using write_file, provide the COMPLETE file content (not just diffs) so it can be applied correctly.
5. Use **search_web** when you need current documentation or are uncertain about an API.
6. Be specific about which stores changes affect — use store-overrides.ts for per-store changes.

## Code Quality Rules
- TypeScript strict — no any unless absolutely necessary
- No comments that just describe what the code does
- Imports always at the top of the file
- Keep route handlers thin — logic in separate functions
- Error handling: throw for exceptional cases, return null for expected missing
- Never use Date.now() in Supabase queries

Always prefer surgical, minimal changes. Never rewrite things that work.`;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_code',
    description: 'Semantic search through the Menius codebase. Use this to find relevant files, functions, or patterns. Results are ranked by relevance using AI reranking.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Natural language description of what you are looking for' },
        limit: { type: 'number', description: 'Max results to return (default: 5, max: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the complete content of a file from the repository. Use the exact file path.',
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
    description: 'List files and folders in a directory. Useful for exploring the project structure.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Directory path relative to repo root, e.g. src/components/public' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the internet for documentation, error solutions, or best practices. Use when you need current information or are unsure about an API.',
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
    description: 'Propose changes to a file. The change will be shown to the user with a diff viewer before being applied. Provide the complete file content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        content: { type: 'string', description: 'Complete new file content' },
        action: {
          type: 'string',
          enum: ['create', 'update', 'delete'],
          description: 'Type of change: create (new file), update (modify existing), delete (remove file)',
        },
        explanation: { type: 'string', description: 'Why this change is needed (shown to user)' },
      },
      required: ['path', 'content', 'action'],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────
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
    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

// ─── Main route ───────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const githubToken = process.env.GITHUB_TOKEN;
    const voyageKey = process.env.VOYAGE_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
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
    const resolvedModel = resolveModel(model);
    const client = new Anthropic({ apiKey: anthropicKey });

    // Agentic loop: allow up to 10 tool use rounds
    let currentMessages = [...messages];
    const pendingChanges: Array<{ path: string; content: string; action: string; explanation?: string }> = [];
    let finalText = '';
    const MAX_ROUNDS = 10;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.messages.create({
        model: resolvedModel,
        max_tokens: 8192,
        system: buildSystemPrompt(),
        tools: (voyageKey && tavilyKey) ? TOOLS : TOOLS.filter(t => t.name !== 'search_web' && t.name !== 'search_code'),
        messages: currentMessages,
      });

      // Collect text from this response
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
      }

      // If model is done (no tool use), break
      if (response.stop_reason !== 'tool_use') break;

      // Find all tool use blocks
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
      if (!toolUseBlocks.length) break;

      // Add assistant message with all content blocks
      currentMessages.push({ role: 'assistant', content: response.content });

      // Execute all tools and collect results
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
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${msg}`,
            is_error: true,
          });
        }
      }

      // Add all tool results in a single user message
      currentMessages.push({ role: 'user', content: toolResults });
    }

    // Save conversation history if requested
    if (saveHistory && conversationId) {
      const allMessages = [...messages];
      if (finalText) {
        allMessages.push({ role: 'assistant', content: finalText });
      }
      await db.from('dev_conversations').upsert({
        id: conversationId,
        messages: JSON.stringify(allMessages),
        model: resolvedModel,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      content: finalText,
      pendingChanges,
      model: resolvedModel,
      rounds: currentMessages.length,
    });
  } catch (err) {
    logger.error('dev chat POST failed', { error: err instanceof Error ? err.message : String(err) });
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET: conversation history ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const db = createAdminClient();
    const conversationId = request.nextUrl.searchParams.get('id');

    if (conversationId) {
      const { data } = await db
        .from('dev_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      return NextResponse.json({ conversation: data });
    }

    // List recent conversations
    const { data } = await db
      .from('dev_conversations')
      .select('id, title, model, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ conversations: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
