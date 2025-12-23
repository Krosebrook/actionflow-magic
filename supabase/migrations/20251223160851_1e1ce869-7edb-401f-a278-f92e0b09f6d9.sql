-- Create audit_logs table for security event tracking
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  user_id UUID,
  workspace_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_workspace_id ON public.audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their workspace
CREATE POLICY "Workspace admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  workspace_id IS NULL OR
  public.is_workspace_admin(workspace_id, auth.uid())
);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for tracking important events';
COMMENT ON COLUMN public.audit_logs.event_type IS 'Type of event: auth_login, auth_logout, auth_failed, permission_change, data_access, rate_limit, etc.';
COMMENT ON COLUMN public.audit_logs.event_category IS 'Category: auth, access, security, data';
COMMENT ON COLUMN public.audit_logs.severity IS 'Severity level: info, warning, error, critical';