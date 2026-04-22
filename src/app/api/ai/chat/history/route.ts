export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ messages: [] });
    }

    const supabase = await createClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('restaurant_id', tenant.restaurantId)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      messages: (messages ?? []).reverse(),
    });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
