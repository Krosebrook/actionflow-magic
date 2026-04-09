import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createAuditLogger } from '../_shared/audit-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
}

async function getGeoLocation(ip: string): Promise<GeoLocation> {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { city: 'Local', region: 'Local Network', country: 'Local', country_code: 'LO' };
  }
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode,lat,lon`);
    const data = await response.json();
    if (data.status === 'success') {
      return { city: data.city, region: data.regionName, country: data.country, country_code: data.countryCode, latitude: data.lat, longitude: data.lon };
    }
  } catch (error) {
    console.error('Geolocation lookup failed:', error);
  }
  return { city: 'Unknown', region: 'Unknown', country: 'Unknown' };
}

function parseUserAgent(userAgent: string): { device_type: string; browser: string; os: string } {
  let device_type = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    device_type = /iPad|Tablet/i.test(userAgent) ? 'Tablet' : 'Mobile';
  }
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edg')) browser = 'Edge';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return { device_type, browser, os };
}

async function checkNewDeviceOrLocation(
  supabase: any,
  userId: string,
  deviceInfo: { device_type: string; browser: string; os: string },
  geo: GeoLocation
): Promise<{ isNewDevice: boolean; isNewLocation: boolean }> {
  const { data: pastSessions } = await supabase
    .from('user_sessions')
    .select('browser, os, device_type, country, city')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!pastSessions || pastSessions.length === 0) {
    return { isNewDevice: true, isNewLocation: true };
  }

  const isNewDevice = !pastSessions.some(
    (s: any) => s.browser === deviceInfo.browser && s.os === deviceInfo.os && s.device_type === deviceInfo.device_type
  );

  const isNewLocation = !pastSessions.some(
    (s: any) => s.country === geo.country && s.city === geo.city
  );

  return { isNewDevice, isNewLocation };
}

async function sendNewDeviceAlert(
  supabase: any,
  userId: string,
  deviceInfo: { device_type: string; browser: string; os: string },
  geo: GeoLocation,
  ip: string,
  isNewDevice: boolean,
  isNewLocation: boolean
) {
  try {
    const metadata: Record<string, string> = {};
    const alerts: string[] = [];

    if (isNewDevice) {
      alerts.push('new_device');
      metadata.device = `${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.device_type})`;
    }
    if (isNewLocation) {
      alerts.push('new_location');
      metadata.location = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
    }
    metadata.ip = ip;
    metadata.alert_types = alerts.join(',');

    // Invoke the security email function
    await supabase.functions.invoke('send-security-email', {
      body: { userId, eventType: 'new_login', metadata },
    });
  } catch (error) {
    console.error('Failed to send new device/location alert:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auditLogger = createAuditLogger(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, session_token, action } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle session revocation
    if (action === 'revoke') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: 'session_token is required for revocation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('user_sessions')
        .update({ is_revoked: true })
        .eq('session_token', session_token)
        .eq('user_id', user_id);

      if (error) throw error;

      await auditLogger.log({
        event_type: 'auth_logout',
        event_category: 'auth',
        user_id,
        severity: 'info',
        details: { action: 'session_revoked', session_token },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Session revoked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle fetching sessions
    if (action === 'list') {
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user_id)
        .eq('is_revoked', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(
        JSON.stringify({ sessions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: track new login
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const geo = await getGeoLocation(ip);
    const deviceInfo = parseUserAgent(userAgent);

    // Check for new device or unusual location BEFORE inserting the new session
    const { isNewDevice, isNewLocation } = await checkNewDeviceOrLocation(supabase, user_id, deviceInfo, geo);

    const finalSessionToken = session_token || crypto.randomUUID();

    // Mark all previous sessions as not current
    await supabase
      .from('user_sessions')
      .update({ is_current: false })
      .eq('user_id', user_id);

    // Insert new session
    const { data: session, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id,
        session_token: finalSessionToken,
        ip_address: ip,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        country_code: geo.country_code,
        latitude: geo.latitude,
        longitude: geo.longitude,
        user_agent: userAgent,
        device_type: deviceInfo.device_type,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        is_current: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Send email alert if new device or unusual location detected
    if (isNewDevice || isNewLocation) {
      await sendNewDeviceAlert(supabase, user_id, deviceInfo, geo, ip, isNewDevice, isNewLocation);
    }

    await auditLogger.log({
      event_type: 'auth_login',
      event_category: 'auth',
      user_id,
      severity: isNewDevice || isNewLocation ? 'warning' : 'info',
      details: { 
        ip_address: ip,
        city: geo.city,
        country: geo.country,
        device: deviceInfo.device_type,
        browser: deviceInfo.browser,
        new_device: isNewDevice,
        new_location: isNewLocation,
      },
    });

    return new Response(
      JSON.stringify({ success: true, session, new_device: isNewDevice, new_location: isNewLocation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Track login session error:', error);
    await auditLogger.logApiError('track-login-session', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
