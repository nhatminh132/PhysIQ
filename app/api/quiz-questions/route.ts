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

function getSupabaseClient() {
  if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const quizSetId = searchParams.get('quiz_set_id');

    const supabase = getSupabaseClient();

    let query = supabase
      .from('questions')
      .select('id, question_text, options, correct_index, difficulty, phase, explanation, quiz_set_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (quizSetId) {
      query = query.eq('quiz_set_id', quizSetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Questions fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: data || [] });
  } catch (err) {
    console.error('Questions fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get('authorization');

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { question_text, options, correct_index, difficulty, phase, explanation, quiz_set_id } = body;

    if (!question_text || !options || correct_index === undefined || !difficulty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return NextResponse.json({ error: 'Must have exactly 4 options' }, { status: 400 });
    }

    if (correct_index < 0 || correct_index > 3) {
      return NextResponse.json({ error: 'correct_index must be 0-3' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let quizSetId = null;
    
    if (quiz_set_id && typeof quiz_set_id === 'string') {
      const trimmed = quiz_set_id.trim();
      
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
        quizSetId = trimmed;
      } else {
        const { data: qs } = await supabase
          .from('quiz_sets')
          .select('id')
          .ilike('name', trimmed)
          .maybeSingle();
        
        if (qs) quizSetId = qs.id;
      }
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        question_text,
        options,
        correct_index,
        difficulty,
        phase: phase || null,
        explanation: explanation || null,
        quiz_set_id: quizSetId,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert question error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch (err) {
    console.error('Question create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get('authorization');

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, question_text, options, correct_index, difficulty, phase, explanation, is_active, quiz_set_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (question_text !== undefined) updateData.question_text = question_text;
    if (options !== undefined) updateData.options = options;
    if (correct_index !== undefined) updateData.correct_index = correct_index;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (phase !== undefined) updateData.phase = phase;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (quiz_set_id !== undefined) updateData.quiz_set_id = quiz_set_id || null;

    const { data, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch (err) {
    console.error('Question update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get('authorization');

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('delete_all') === 'true';

    if (deleteAll) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Đã xóa tất cả câu hỏi' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('questions').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Question delete error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
