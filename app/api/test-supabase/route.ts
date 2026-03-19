import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const result: Record<string, string> = {
    url: url ? (url.includes('your-project') ? 'NOT_SET' : 'OK') : 'MISSING',
    anonKey: anonKey ? (anonKey.includes('eyJ') ? 'OK' : 'INVALID') : 'MISSING',
    serviceKey: serviceKey ? (serviceKey.includes('eyJ') ? 'OK' : 'INVALID') : 'MISSING',
  };

  if (result.url === 'OK' && result.serviceKey === 'OK') {
    try {
      const supabase = createClient(url!, serviceKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase.from('licenses').select('id').limit(1);
      if (error) {
        result.dbStatus = `ERROR: ${error.message}`;
      } else {
        result.dbStatus = 'OK - Connected to database';
      }
    } catch (err) {
      result.dbStatus = `CONNECTION_ERROR: ${(err as Error).message}`;
    }
  }

  return NextResponse.json(result);
}
