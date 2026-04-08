import { Buffer } from 'buffer';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';
const GITHUB_BRANCH = 'main';
const VOYAGE_API = 'https://api.voyageai.com/v1';

// ─── GitHub helpers ────────────────────────────────────────────────────────────
export async function githubFetch(apiPath: string, token: string, method = 'GET', body?: object) {
  const res = await fetch(`https://api.github.com/${apiPath}`, {
    method,
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${apiPath}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function readFileGH(filePath: string, token: string): Promise<string> {
  const data = await githubFetch(
    `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`, token
  );
  return data.encoding === 'base64'
    ? Buffer.from(data.content, 'base64').toString('utf-8')
    : (data.content ?? '');
}

export async function listFiles(dirPath: string, token: string): Promise<string> {
  try {
    const data = await githubFetch(
      `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${dirPath}?ref=${GITHUB_BRANCH}`, token
    );
    if (!Array.isArray(data)) return JSON.stringify(data);
    return data.map((f: { name: string; type: string; size?: number }) =>
      `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size}b)` : ''}`
    ).join('\n');
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function getRelatedFiles(
  filePath: string,
  fileContent: string,
  githubToken: string,
): Promise<Array<{ path: string; content: string }>> {
  const relatedFiles: Set<string> = new Set();
  const posixDir = filePath.split(path.sep).join('/');

  // Extract import paths
  const importRegex = /(?:import(?:[\s\S]*?)from\s+['"](.+?)['"]|require\(['"](.+?)['"]\))/g;
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const imported = match[1] || match[2];
    if (!imported) continue;
    if (imported.startsWith('.')) {
      const resolved = path.posix.resolve(path.posix.dirname(posixDir), imported).replace(/\.(js|ts|jsx|tsx)$/, '');
      relatedFiles.add(resolved);
    } else if (imported.startsWith('@/')) {
      relatedFiles.add(imported.replace('@/', 'src/'));
    }
  }

  // Add sibling files (up to 3)
  const dirPath = path.posix.dirname(posixDir);
  try {
    const data = await githubFetch(
      `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${dirPath}?ref=${GITHUB_BRANCH}`,
      githubToken,
    );
    if (Array.isArray(data)) {
      data
        .filter((f: { name: string; type: string }) =>
          f.type === 'file' && f.name !== path.posix.basename(posixDir),
        )
        .map((f: { path: string }) => f.path)
        .slice(0, 3)
        .forEach(f => relatedFiles.add(f));
    }
  } catch { /* ignore */ }

  // Read content of related files
  const results: Array<{ path: string; content: string }> = [];
  for (const p of Array.from(relatedFiles)) {
    try {
      const content = await readFileGH(p, githubToken);
      results.push({ path: p, content: content.slice(0, 3000) });
    } catch { /* ignore missing files */ }
  }
  return results.slice(0, 5);
}

// ─── Code search (Voyage AI + pgvector) ───────────────────────────────────────
export async function searchCode(
  query: string,
  limit: number,
  voyageKey: string,
  db: SupabaseClient,
): Promise<string> {
  if (!voyageKey) return 'VOYAGE_API_KEY not configured.';

  const embedRes = await fetch(`${VOYAGE_API}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: [query], model: 'voyage-code-3' }),
  });
  if (!embedRes.ok) return `Voyage embedding error: ${embedRes.status}`;
  const embedData = await embedRes.json();
  const embedding = embedData.data?.[0]?.embedding;
  if (!embedding) return 'Failed to get embedding.';

  const { data, error } = await (db as unknown as Record<string, Function>).rpc('search_code_embeddings', {
    query_embedding: embedding,
    match_count: Math.min(limit ?? 5, 10),
  }) as { data: Array<{ file_path: string; content: string }> | null; error: { message: string } | null };

  if (error) return `Search error: ${error.message}`;
  if (!data || data.length === 0) return 'No code matches found.';

  // Rerank
  try {
    const rerankRes = await fetch(`${VOYAGE_API}/rerank`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, documents: data.map(r => r.content), model: 'rerank-2', top_k: limit }),
    });
    if (rerankRes.ok) {
      const rerankData = await rerankRes.json();
      const reranked = (rerankData.data as Array<{ index: number; relevance_score: number }>)
        ?.sort((a, b) => b.relevance_score - a.relevance_score)
        .map(({ index }) => data[index])
        .filter(Boolean);
      if (reranked?.length) {
        return reranked.map(r => `### ${r.file_path}\n\`\`\`\n${r.content}\n\`\`\``).join('\n\n');
      }
    }
  } catch { /* skip rerank */ }

  return data.map(r => `### ${r.file_path}\n\`\`\`\n${r.content}\n\`\`\``).join('\n\n');
}

// ─── Web search ────────────────────────────────────────────────────────────────
export async function searchWebTavily(query: string, tavilyKey: string): Promise<string> {
  if (!tavilyKey) return 'TAVILY_API_KEY not configured.';
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: tavilyKey, query, max_results: 5, include_answer: true }),
  });
  if (!res.ok) return `Tavily error: ${res.status}`;
  const data = await res.json();
  const answer = data.answer ? `**Respuesta:** ${data.answer}\n\n` : '';
  const results = (data.results ?? [])
    .map((r: { title: string; url: string; content: string }) => `**${r.title}**\n${r.url}\n${r.content}`)
    .join('\n\n');
  return (answer + results).slice(0, 15000) || 'No results.';
}

export async function fetchUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    return text.slice(0, 20000);
  } catch (err) {
    return `Error fetching URL: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ─── Vercel ────────────────────────────────────────────────────────────────────
export async function rollbackVercel(deploymentId: string, reason?: string): Promise<string> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID env vars.';

  let dplId = deploymentId;
  if (deploymentId === 'previous') {
    const listRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&state=READY&target=production&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const listData = await listRes.json();
    const lastGood = listData.deployments?.[0];
    if (!lastGood) return 'No successful production deployments found.';
    dplId = lastGood.uid;
  }

  const res = await fetch(`https://api.vercel.com/v9/now/deployments/${dplId}/promote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) return `Vercel rollback failed: ${await res.text()}`;
  return `✅ Deployment ${dplId} promoted to production.${reason ? ` Reason: ${reason}` : ''}`;
}

export async function getVercelEnvVars(): Promise<string> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID env vars.';

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return `Vercel API error: ${res.status}`;
  const data = await res.json();
  return (data.envs ?? [])
    .map((e: { key: string; type: string; target: string[] }) =>
      `${e.key} [${e.type}] → ${e.target.join(', ')}`,
    )
    .join('\n');
}

export async function getVercelFunctionLogs(functionPath?: string): Promise<string> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID env vars.';

  const deploymentsRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&state=READY&target=production&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!deploymentsRes.ok) return `Failed to list deployments: ${deploymentsRes.status}`;
  const deploymentsData = await deploymentsRes.json();
  const latestDpl = deploymentsData.deployments?.[0];
  if (!latestDpl) return 'No production deployments found.';

  const logsRes = await fetch(
    `https://api.vercel.com/v2/deployments/${latestDpl.uid}/events?limit=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!logsRes.ok) return `Failed to get logs: ${logsRes.status}`;
  const events = await logsRes.json();
  const items: Array<{ type: string; payload?: { text?: string; id?: string } }> =
    Array.isArray(events) ? events : (events.events ?? []);

  return items
    .filter(e =>
      (e.type === 'stderr' || e.type === 'stdout') &&
      (!functionPath || e.payload?.id?.includes(functionPath)),
    )
    .map(e => `[${e.type}] ${e.payload?.text ?? ''}`)
    .slice(-50)
    .join('\n') || 'No logs found.';
}

// ─── Stripe ────────────────────────────────────────────────────────────────────
export async function queryStripe(query: string): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return 'Missing STRIPE_SECRET_KEY env var.';

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey);
  const q = query.toLowerCase();

  try {
    if (q.includes('revenue') || q.includes('mrr') || q.includes('ingreso')) {
      const monthStart = Math.floor(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000,
      );
      const [charges, subs] = await Promise.all([
        stripe.charges.list({ created: { gte: monthStart }, limit: 100 }),
        stripe.subscriptions.list({ status: 'active', limit: 100 }),
      ]);
      const revenue = charges.data
        .filter(c => c.status === 'succeeded')
        .reduce((s, c) => s + c.amount, 0);
      const mrr = subs.data.reduce((s, sub) => {
        const price = sub.items.data[0]?.price;
        if (!price?.unit_amount) return s;
        return s + (price.recurring?.interval === 'year' ? price.unit_amount / 12 : price.unit_amount);
      }, 0);
      return `Revenue this month: $${(revenue / 100).toFixed(2)} USD\nActive subscriptions: ${subs.data.length}\nEstimated MRR: $${(mrr / 100).toFixed(2)} USD`;
    }

    if (q.includes('subscription') || q.includes('suscripci')) {
      const subs = await stripe.subscriptions.list({ status: 'all', limit: 25 });
      return subs.data
        .map(s => `${s.id}: ${s.status} — ${s.customer} (ends ${new Date(s.current_period_end * 1000).toLocaleDateString()})`)
        .join('\n');
    }

    if (q.includes('customer') || q.includes('cliente')) {
      const customers = await stripe.customers.list({ limit: 20 });
      return customers.data
        .map(c => `${c.email ?? 'no-email'} — ${c.id} (${new Date(c.created * 1000).toLocaleDateString()})`)
        .join('\n');
    }

    if (q.includes('fail') || q.includes('error') || q.includes('fallo')) {
      const charges = await stripe.charges.list({ limit: 20 });
      const failed = charges.data.filter(c => c.status === 'failed');
      return failed.length === 0
        ? 'No failed charges recently.'
        : failed.map(c => `${c.id}: $${(c.amount / 100).toFixed(2)} — ${c.failure_message}`).join('\n');
    }

    const subs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
    return `Active subscriptions: ${subs.data.length}`;
  } catch (err) {
    return `Stripe error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ─── Database ──────────────────────────────────────────────────────────────────
export async function queryDB(sql: string, db: SupabaseClient): Promise<string> {
  if (!sql.trim().toLowerCase().startsWith('select')) {
    return 'Only SELECT queries are allowed for safety.';
  }
  try {
    const { data, error } = await (db as unknown as Record<string, Function>).rpc('exec_sql', {
      query_text: sql,
    }) as { data: unknown[] | null; error: { message: string } | null };
    if (error) throw new Error(error.message);
    if (!data || (Array.isArray(data) && data.length === 0)) return 'No results.';
    return JSON.stringify(data, null, 2).slice(0, 20000);
  } catch (err) {
    return `Query error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function writeDB(
  table: string,
  row: Record<string, unknown>,
  action: 'insert' | 'update' | 'delete',
  matchColumn: string | undefined,
  db: SupabaseClient,
): Promise<string> {
  const ALLOWED = ['restaurants', 'products', 'categories', 'restaurant_hours', 'dev_alerts'];
  if (!ALLOWED.includes(table)) {
    return `Table "${table}" not allowed. Allowed: ${ALLOWED.join(', ')}`;
  }
  try {
    if (action === 'insert') {
      const { error } = await db.from(table).insert(row);
      if (error) throw error;
      return `✅ Row inserted into ${table}.`;
    }
    if (action === 'update') {
      if (!matchColumn || row[matchColumn] === undefined) {
        return `matchColumn "${matchColumn}" is required for update.`;
      }
      const matchValue = row[matchColumn];
      const updateData = { ...row };
      delete updateData[matchColumn];
      const { error } = await db.from(table).update(updateData).eq(matchColumn, matchValue as string);
      if (error) throw error;
      return `✅ Updated ${table} where ${matchColumn} = ${matchValue}.`;
    }
    if (action === 'delete') {
      if (!matchColumn || row[matchColumn] === undefined) {
        return `matchColumn "${matchColumn}" is required for delete.`;
      }
      const { error } = await db.from(table).delete().eq(matchColumn, row[matchColumn] as string);
      if (error) throw error;
      return `✅ Deleted from ${table} where ${matchColumn} = ${row[matchColumn]}.`;
    }
    return `Unknown action: ${action}`;
  } catch (err) {
    return `DB error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function getSupabaseSchema(db: SupabaseClient): Promise<string> {
  try {
    const { data, error } = await (db as unknown as Record<string, Function>).rpc('exec_sql', {
      query_text: `
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
        LIMIT 500;
      `,
    }) as { data: Array<{ table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null }> | null; error: { message: string } | null };

    if (error) throw new Error(error.message);

    const grouped: Record<string, string[]> = {};
    for (const row of (data ?? [])) {
      if (!grouped[row.table_name]) grouped[row.table_name] = [];
      grouped[row.table_name].push(
        `  ${row.column_name} ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}${row.column_default ? ` DEFAULT ${row.column_default}` : ''}`,
      );
    }

    return Object.entries(grouped)
      .map(([table, cols]) => `**${table}**\n${cols.join('\n')}`)
      .join('\n\n')
      .slice(0, 15000);
  } catch (err) {
    return `Schema error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ─── Sentry ────────────────────────────────────────────────────────────────────
export async function getSentryErrors(limit = 10): Promise<string> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  if (!token || !org || !project) {
    return 'Missing SENTRY_AUTH_TOKEN, SENTRY_ORG, or SENTRY_PROJECT env vars.';
  }

  const res = await fetch(
    `https://sentry.io/api/0/projects/${org}/${project}/issues/?is_unresolved=true&limit=${limit}&sort=date`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return `Sentry API error: ${res.status}`;
  const issues = await res.json();
  if (!Array.isArray(issues) || issues.length === 0) return 'No unresolved Sentry issues.';

  return issues
    .map((issue: { title: string; culprit: string; count: string; lastSeen: string; permalink: string }) =>
      `**${issue.title}**\n${issue.culprit}\nOccurrences: ${issue.count} | Last seen: ${issue.lastSeen}\n${issue.permalink}`,
    )
    .join('\n\n');
}
