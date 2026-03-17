/**
 * Driver proof-of-delivery photo upload.
 * Accepts multipart/form-data: { token, photo (File) }
 * Uploads to Supabase Storage → order-photos bucket, stores URL on the order.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const token = formData.get('token') as string | null;
  const photo = formData.get('photo') as File | null;

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  if (!photo) return NextResponse.json({ error: 'photo required' }, { status: 400 });

  const supabase = createAdminClient();

  // Find order by token
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // Upload photo to Supabase Storage
  const ext = photo.name.split('.').pop() ?? 'jpg';
  const path = `delivery/${order.id}/${Date.now()}.${ext}`;
  const bytes = await photo.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('order-photos')
    .upload(path, bytes, { contentType: photo.type, upsert: true });

  if (uploadError) {
    // If bucket doesn't exist yet, return error with helpful message
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('order-photos').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ delivery_photo_url: publicUrl })
    .eq('id', order.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, url: publicUrl });
}
