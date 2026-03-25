import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Test with anon key
    const anonClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: anonData, error: anonError } = await anonClient
      .from('restaurants')
      .select('id, name, slug')
      .eq('slug', 'tamales')
      .maybeSingle();

    // Test with service key
    const serviceClient = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: serviceData, error: serviceError } = await serviceClient
      .from('restaurants')
      .select('id, name, slug')
      .eq('slug', 'tamales')
      .maybeSingle();

    return NextResponse.json({
      env: {
        url: url ? 'SET' : 'NOT SET',
        anonKey: anonKey ? 'SET' : 'NOT SET',
        serviceKey: serviceKey ? 'SET' : 'NOT SET',
      },
      anonTest: {
        data: anonData,
        error: anonError ? { message: anonError.message, code: anonError.code } : null,
      },
      serviceTest: {
        data: serviceData,
        error: serviceError ? { message: serviceError.message, code: serviceError.code } : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
