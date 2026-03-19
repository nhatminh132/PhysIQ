import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('quiz_sets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json({ quiz_sets: data });
  } catch (error) {
    console.error('Error fetching quiz sets:', error);
    return Response.json({ error: 'Failed to fetch quiz sets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('quiz_sets')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ quiz_set: data });
  } catch (error) {
    console.error('Error creating quiz set:', error);
    return Response.json({ error: 'Failed to create quiz set' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, is_active } = body;

    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('quiz_sets')
      .update({ name, is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ quiz_set: data });
  } catch (error) {
    console.error('Error updating quiz set:', error);
    return Response.json({ error: 'Failed to update quiz set' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('quiz_sets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz set:', error);
    return Response.json({ error: 'Failed to delete quiz set' }, { status: 500 });
  }
}
