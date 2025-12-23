import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export type AuditEventType = 
  | 'auth_login'
  | 'auth_logout'
  | 'auth_failed'
  | 'auth_signup'
  | 'rate_limit_exceeded'
  | 'request_size_exceeded'
  | 'permission_denied'
  | 'data_access'
  | 'data_create'
  | 'data_update'
  | 'data_delete'
  | 'webhook_received'
  | 'api_error'
  | 'validation_failed';

export type AuditEventCategory = 'auth' | 'access' | 'security' | 'data';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  event_type: AuditEventType;
  event_category: AuditEventCategory;
  user_id?: string;
  workspace_id?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  severity?: AuditSeverity;
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        event_type: entry.event_type,
        event_category: entry.event_category,
        user_id: entry.user_id || null,
        workspace_id: entry.workspace_id || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        resource_type: entry.resource_type || null,
        resource_id: entry.resource_id || null,
        details: entry.details || {},
        severity: entry.severity || 'info',
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    // Don't throw - audit logging should never break the main flow
    console.error('Audit logging error:', err);
  }
}

export function createAuditLogger(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    log: async (entry: Omit<AuditLogEntry, 'ip_address' | 'user_agent'>) => {
      await logAuditEvent(supabase, {
        ...entry,
        ip_address: ip,
        user_agent: userAgent,
      });
    },
    
    logRateLimit: async (functionName: string) => {
      await logAuditEvent(supabase, {
        event_type: 'rate_limit_exceeded',
        event_category: 'security',
        ip_address: ip,
        user_agent: userAgent,
        resource_type: 'edge_function',
        resource_id: functionName,
        severity: 'warning',
        details: { function_name: functionName },
      });
    },
    
    logRequestSizeExceeded: async (functionName: string, size: number, limit: number) => {
      await logAuditEvent(supabase, {
        event_type: 'request_size_exceeded',
        event_category: 'security',
        ip_address: ip,
        user_agent: userAgent,
        resource_type: 'edge_function',
        resource_id: functionName,
        severity: 'warning',
        details: { function_name: functionName, request_size: size, limit },
      });
    },
    
    logValidationFailed: async (functionName: string, errors: unknown) => {
      await logAuditEvent(supabase, {
        event_type: 'validation_failed',
        event_category: 'security',
        ip_address: ip,
        user_agent: userAgent,
        resource_type: 'edge_function',
        resource_id: functionName,
        severity: 'warning',
        details: { function_name: functionName, validation_errors: errors },
      });
    },
    
    logApiError: async (functionName: string, error: string) => {
      await logAuditEvent(supabase, {
        event_type: 'api_error',
        event_category: 'security',
        ip_address: ip,
        user_agent: userAgent,
        resource_type: 'edge_function',
        resource_id: functionName,
        severity: 'error',
        details: { function_name: functionName, error },
      });
    },
  };
}
