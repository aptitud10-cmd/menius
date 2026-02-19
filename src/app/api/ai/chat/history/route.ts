import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ messages: [] });
    }

    const supabase = createClient();
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      messages: (messages ?? []).reverse(),
    });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
