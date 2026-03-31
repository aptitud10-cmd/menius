import { NextRequest, NextResponse } from 'next/server';
import { getDashboardContext } from '@/lib/get-dashboard-context';

export async function GET() {
  try {
    const { supabase, restaurantId } = await getDashboardContext();
    const { data, error } = await supabase
      .from('kds_stations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('position');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ stations: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, restaurantId } = await getDashboardContext();
    const body = await req.json();
    const { name, color, position } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const { data, error } = await supabase
      .from('kds_stations')
      .insert({ restaurant_id: restaurantId, name: name.trim(), color: color ?? '#06c167', position: position ?? 0 })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ station: data });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, restaurantId } = await getDashboardContext();
    const body = await req.json();

    // Reorder
    if (body.reorder) {
      const updates = (body.reorder as { id: string; position: number }[]).map(({ id, position }) =>
        supabase.from('kds_stations').update({ position }).eq('id', id).eq('restaurant_id', restaurantId)
      );
      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, restaurantId } = await getDashboardContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('kds_stations')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
