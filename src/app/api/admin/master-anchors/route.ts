export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-master-anchors');

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('master_style_anchors')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) {
    logger.error('Failed to list master anchors', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ anchors: data ?? [] });
}

/**
 * Update a master anchor (set anchor_url and/or aliases).
 * Body: { id: string, anchor_url?: string, aliases?: string[] }
 */
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_by: admin.user.id };
  if (typeof body.anchor_url === 'string') updates.anchor_url = body.anchor_url;
  if (Array.isArray(body.aliases)) {
    updates.aliases = body.aliases
      .filter((a: unknown): a is string => typeof a === 'string')
      .map((a: string) => a.trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof body.notes === 'string') updates.notes = body.notes;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('master_style_anchors')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update master anchor', { error: error.message, id: body.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logger.info('Master anchor updated', { id: body.id, by: admin.user.email });
  return NextResponse.json({ anchor: data });
}

/**
 * Clear a master anchor's image (sets anchor_url back to null).
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('master_style_anchors')
    .update({ anchor_url: null, updated_by: admin.user.id })
    .eq('id', body.id);

  if (error) {
    logger.error('Failed to clear master anchor', { error: error.message, id: body.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logger.info('Master anchor cleared', { id: body.id, by: admin.user.email });
  return NextResponse.json({ ok: true });
}
