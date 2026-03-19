import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_id, client_id, score, total_questions, details, time_taken_seconds, difficulty_breakdown, rating } = body;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        license_id: license_id || null,
        client_id: client_id || null,
        score: score ?? 0,
        total_questions: total_questions ?? 30,
        details: details || [],
        time_taken_seconds: time_taken_seconds || null,
        difficulty_breakdown: difficulty_breakdown || null,
        rating: rating || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Attempt save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempt: data }, { status: 201 });
  } catch (err) {
    console.error('Attempt save error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get('authorization');

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, licenses(owner_name), clients(domain)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempts: data });
  } catch (err) {
    console.error('Attempts fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
