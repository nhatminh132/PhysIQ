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

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  return null;
}

function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  let browser = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  let osVersion = '';
  let deviceType = 'Desktop';

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'Tablet';
  }

  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    const match = ua.match(/version\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
    const match = ua.match(/edg\/(\d+)/);
    browserVersion = match ? match[1] : '';
  }

  if (ua.includes('windows')) {
    os = 'Windows';
    if (ua.includes('windows nt 10')) osVersion = '10/11';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (ua.includes('mac os')) {
    os = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = ua.match(/android (\d+)/);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    const match = ua.match(/os (\d+)/);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  return { browser, browserVersion, os, osVersion, deviceType };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, instance_id, domain } = body;
    const userAgent = request.headers.get('user-agent') || body.user_agent || '';

    if (!license_key || !instance_id) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PARAMS', message: 'Thiếu license_key hoặc instance_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { success: false, error: 'LICENSE_NOT_FOUND', message: 'License key không tồn tại' },
        { status: 404 }
      );
    }

    if (license.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: license.status === 'revoked' ? 'LICENSE_REVOKED' : 'LICENSE_INVALID',
          status: license.status,
          message: `License đã bị ${license.status === 'revoked' ? 'vô hiệu hóa' : 'hết hạn'}`,
          revoked_at: license.revoked_at,
          revoked_reason: license.revoked_reason,
        },
        { status: 403 }
      );
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
      return NextResponse.json(
        { success: false, error: 'LICENSE_EXPIRED', message: 'License đã hết hạn' },
        { status: 403 }
      );
    }

    const ipAddress = getClientIP(request);
    const { browser, browserVersion, os, osVersion, deviceType } = parseUserAgent(userAgent);

    const { data: existingUser } = await supabase
      .from('license_users')
      .select('*')
      .eq('license_id', license.id)
      .eq('instance_id', instance_id)
      .single();

    if (existingUser) {
      await supabase
        .from('license_users')
        .update({
          ip_address: ipAddress || existingUser.ip_address,
          browser,
          browser_version: browserVersion,
          os,
          os_version: osVersion,
          device_type: deviceType,
          domain: domain || existingUser.domain,
          last_seen_at: new Date().toISOString(),
          total_sessions: (existingUser.total_sessions || 0) + 1,
          is_active: true,
        })
        .eq('id', existingUser.id);

      await supabase
        .from('clients')
        .update({
          last_seen_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('instance_id', instance_id);
    } else {
      if (license.activation_count >= license.max_activations) {
        return NextResponse.json(
          {
            success: false,
            error: 'MAX_ACTIVATIONS_REACHED',
            message: `Đã đạt số lượng kích hoạt tối đa (${license.max_activations})`,
          },
          { status: 403 }
        );
      }

      await supabase.from('license_users').insert({
        license_id: license.id,
        instance_id,
        ip_address: ipAddress || null,
        browser,
        browser_version: browserVersion,
        os,
        os_version: osVersion,
        device_type: deviceType,
        domain: domain || null,
        is_active: true,
        total_sessions: 1,
      });

      await supabase.from('clients').insert({
        license_id: license.id,
        instance_id,
        domain: domain || null,
        ip_address: ipAddress || null,
        user_agent: userAgent,
        is_active: true,
      });

      await supabase
        .from('licenses')
        .update({ activation_count: license.activation_count + 1 })
        .eq('id', license.id);
    }

    await supabase
      .from('licenses')
      .update({ last_checkin: new Date().toISOString() })
      .eq('id', license.id);

    let quizSetId = null;
    try {
      const { data: lqs } = await supabase
        .from('license_quiz_sets')
        .select('quiz_set_id')
        .eq('license_id', license.id)
        .single();
      if (lqs) quizSetId = lqs.quiz_set_id;
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      license_key: license.license_key,
      owner_name: license.owner_name,
      expires_at: license.expires_at,
      metadata: license.metadata,
      quiz_set_id: quizSetId,
      custom_config: license.custom_config,
    });
  } catch (err) {
    console.error('Checkin error:', err);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Lỗi server nội bộ' },
      { status: 500 }
    );
  }
}
