import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { license_id, quiz_set_id } = body;

    if (!license_id) {
      return Response.json({ error: 'License ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (quiz_set_id && typeof quiz_set_id === 'string') {
      quiz_set_id = quiz_set_id.trim();
      if (quiz_set_id === '') quiz_set_id = null;
    } else {
      quiz_set_id = null;
    }

    if (quiz_set_id) {
      const { error } = await supabase
        .from('license_quiz_sets')
        .upsert({ 
          license_id, 
          quiz_set_id
        }, { onConflict: 'license_id' });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('license_quiz_sets')
        .delete()
        .eq('license_id', license_id);

      if (error) throw error;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error assigning quiz set:', error);
    return Response.json({ error: 'Failed to assign quiz set' }, { status: 500 });
  }
}
