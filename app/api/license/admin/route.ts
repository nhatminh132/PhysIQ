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

function verifyAdmin(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get('authorization');
  return Boolean(adminPassword && authHeader === `Bearer ${adminPassword}`);
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: quizSets } = await supabase
      .from('quiz_sets')
      .select('*')
      .eq('is_active', true);

    const { data: licenseQuizSets } = await supabase
      .from('license_quiz_sets')
      .select('*');

    const licensesWithQuizSets = (licenses || []).map((license: Record<string, unknown>) => {
      const lqs = (licenseQuizSets || []).find((lqs: Record<string, unknown>) => lqs.license_id === license.id);
      const qs = lqs ? (quizSets || []).find((q: Record<string, unknown>) => q.id === lqs.quiz_set_id) : null;
      return {
        ...license,
        quiz_set_id: lqs?.quiz_set_id || null,
        quiz_set_name: qs?.name || null,
      };
    });

    return NextResponse.json({ licenses: licensesWithQuizSets, quiz_sets: quizSets || [] });
  } catch (err) {
    console.error('License list error:', err);
    return NextResponse.json({ error: 'Server error', detail: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { owner_name, owner_email, max_activations, expires_at, quiz_set_id } = body;

    const licenseKey = 'PHY-' + Array.from({ length: 24 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');

    const supabase = getSupabaseAdmin();
    const { data: license, error } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        owner_name: owner_name || null,
        owner_email: owner_email || null,
        max_activations: max_activations || 1,
        expires_at: expires_at || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (quiz_set_id) {
      await supabase.from('license_quiz_sets').insert({
        license_id: license.id,
        quiz_set_id: quiz_set_id,
      });
    }

    return NextResponse.json({ license }, { status: 201 });
  } catch (err) {
    console.error('License create error:', err);
    return NextResponse.json({ error: 'Server error', detail: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action, revoked_reason } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (action === 'revoke') {
      const { data, error } = await supabase
        .from('licenses')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_reason: revoked_reason || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ license: data });
    }

    if (action === 'restore') {
      const { data, error } = await supabase
        .from('licenses')
        .update({
          status: 'active',
          revoked_at: null,
          revoked_reason: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ license: data });
    }

    if (action === 'update') {
      const { owner_name, owner_email, max_activations, expires_at, quiz_set_id } = body;

      if (max_activations !== undefined) {
        const { data: current } = await supabase
          .from('licenses')
          .select('activation_count')
          .eq('id', id)
          .single();

        if (current && max_activations < current.activation_count) {
          return NextResponse.json({
            error: 'INVALID_MAX_ACTIVATIONS',
            message: `max_activations không thể nhỏ hơn số thiết bị đã kích hoạt (${current.activation_count})`
          }, { status: 400 });
        }
      }

      const updateData: Record<string, unknown> = {};
      if (owner_name !== undefined) updateData.owner_name = owner_name;
      if (owner_email !== undefined) updateData.owner_email = owner_email;
      if (max_activations !== undefined) updateData.max_activations = max_activations;
      if (expires_at !== undefined) updateData.expires_at = expires_at;

      const { data, error } = await supabase
        .from('licenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (quiz_set_id !== undefined) {
        await supabase.from('license_quiz_sets').delete().eq('license_id', id);
        if (quiz_set_id) {
          await supabase.from('license_quiz_sets').insert({
            license_id: id,
            quiz_set_id: quiz_set_id,
          });
        }
      }

      return NextResponse.json({ license: data });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('licenses').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('License update error:', err);
    return NextResponse.json({ error: 'Server error', detail: (err as Error).message }, { status: 500 });
  }
}
