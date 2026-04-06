export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/cleanup-demo-images
 * Weekly cron — deletes AI-generated demo images older than 7 days.
 *
 * Demo images are stored by unauthenticated users under:
 *   product-images/ai-enhance/demo-{id}/
 *   product-images/ai-generate/demo-{id}/
 *
 * These accumulate indefinitely without cleanup and drive up storage costs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('cleanup-demo-images');

const DEMO_PREFIXES = ['ai-enhance', 'ai-generate'];
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATCH_SIZE = 100;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - MAX_AGE_MS);
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const prefix of DEMO_PREFIXES) {
    try {
      // List all files under this prefix
      const { data: files, error: listErr } = await admin.storage
        .from('product-images')
        .list(prefix, { limit: 1000, offset: 0 });

      if (listErr) {
        logger.warn(`Failed to list ${prefix}`, { error: listErr.message });
        continue;
      }

      // Filter to demo-* folders only
      const demoPrefixes = (files ?? [])
        .filter(f => f.name.startsWith('demo-'))
        .map(f => f.name);

      for (const demoFolder of demoPrefixes) {
        const folderPath = `${prefix}/${demoFolder}`;

        // List files inside the demo folder
        const { data: folderFiles, error: folderErr } = await admin.storage
          .from('product-images')
          .list(folderPath, { limit: BATCH_SIZE });

        if (folderErr || !folderFiles?.length) continue;

        // Filter files older than cutoff using their metadata
        // Supabase storage list returns `created_at` on each file object
        const oldFiles = folderFiles.filter(f => {
          const created = f.created_at ? new Date(f.created_at) : null;
          return created && created < cutoff;
        });

        if (!oldFiles.length) continue;

        const paths = oldFiles.map(f => `${folderPath}/${f.name}`);

        const { error: deleteErr } = await admin.storage
          .from('product-images')
          .remove(paths);

        if (deleteErr) {
          logger.warn(`Delete failed in ${folderPath}`, { error: deleteErr.message });
          totalErrors += paths.length;
        } else {
          totalDeleted += paths.length;
          logger.info(`Deleted ${paths.length} files from ${folderPath}`);
        }
      }
    } catch (err) {
      logger.error(`Error processing prefix ${prefix}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Cleanup complete', { totalDeleted, totalErrors });
  return NextResponse.json({ ok: true, deleted: totalDeleted, errors: totalErrors });
}
