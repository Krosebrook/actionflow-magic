import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Security headers including CORS and CSP
const securityHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Sanitize string input to prevent XSS
function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Remove potentially dangerous characters from text content
function sanitizeTextContent(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Rate limiting for webhooks (stricter limits)
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 webhook events per minute per IP

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

// Schema for Microsoft Graph webhook event
const TeamsEventSchema = z.object({
  resourceData: z.object({
    '@odata.type': z.string(),
    id: z.string().optional(),
    subject: z.string().optional(),
    bodyPreview: z.string().optional(),
    start: z.object({
      dateTime: z.string(),
      timeZone: z.string().optional(),
    }).optional(),
    end: z.object({
      dateTime: z.string(),
      timeZone: z.string().optional(),
    }).optional(),
    organizer: z.object({
      emailAddress: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
      }).optional(),
    }).optional(),
    onlineMeeting: z.object({
      joinUrl: z.string().optional(),
    }).optional(),
  }).passthrough(),
  changeType: z.enum(['created', 'updated', 'deleted']),
  clientState: z.string().optional(),
  subscriptionId: z.string().optional(),
  tenantId: z.string().optional(),
});

const WebhookPayloadSchema = z.object({
  value: z.array(TeamsEventSchema),
});

type TeamsResourceData = z.infer<typeof TeamsEventSchema>['resourceData'];

// Verify Microsoft Graph webhook signature using clientState
async function verifyWebhookSignature(
  clientState: string | null | undefined
): Promise<boolean> {
  const TEAMS_WEBHOOK_SECRET = Deno.env.get('TEAMS_WEBHOOK_SECRET');
  
  // If no secret is configured, log warning but allow in development
  if (!TEAMS_WEBHOOK_SECRET) {
    console.warn('TEAMS_WEBHOOK_SECRET not configured - signature verification skipped');
    return true;
  }

  // Microsoft Graph sends clientState that should match what we configured
  if (!clientState || clientState !== TEAMS_WEBHOOK_SECRET) {
    console.error('Client state mismatch or missing');
    return false;
  }

  return true;
}

// Map tenant/organizer to workspace
async function mapToWorkspace(
  supabase: SupabaseClient,
  tenantId: string | undefined,
  organizerEmail: string | undefined
): Promise<{ workspaceId: string; userId: string } | null> {
  // Try to find integration config that matches the tenant
  if (tenantId) {
    const { data: integration } = await supabase
      .from('integrations')
      .select('workspace_id, config')
      .eq('integration_type', 'teams')
      .eq('is_active', true)
      .single();
    
    if (integration) {
      const config = integration.config as { tenantId?: string };
      if (config.tenantId === tenantId) {
        // Get a user from this workspace
        const { data: member } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', integration.workspace_id)
          .limit(1)
          .single();
        
        if (member) {
          return { 
            workspaceId: integration.workspace_id, 
            userId: member.user_id 
          };
        }
      }
    }
  }

  // Fallback: try to match by organizer email
  if (organizerEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', organizerEmail.toLowerCase())
      .single();
    
    if (profile) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)
        .limit(1)
        .single();
      
      if (membership) {
        return { 
          workspaceId: membership.workspace_id, 
          userId: profile.id 
        };
      }
    }
  }

  console.log('Could not map webhook to workspace - no matching tenant or organizer');
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: securityHeaders });
  }

  // Rate limiting check
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: { 
          ...securityHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter || 60),
        },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle Teams validation challenge
    const url = new URL(req.url);
    const validationToken = url.searchParams.get('validationToken');
    
    if (validationToken) {
      // Validate the token format (should be a simple string)
      if (!/^[a-zA-Z0-9_-]+$/.test(validationToken)) {
        console.error('Invalid validation token format');
        return new Response('Invalid token format', {
          status: 400,
          headers: { ...securityHeaders, 'Content-Type': 'text/plain' },
        });
      }
      
      console.log('Handling Teams validation challenge');
      return new Response(validationToken, {
        headers: { ...securityHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Get raw body for parsing
    const rawBody = await req.text();
    
    let payload: z.infer<typeof WebhookPayloadSchema>;
    
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('Invalid JSON payload');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payload structure
    const validationResult = WebhookPayloadSchema.safeParse(payload);
    if (!validationResult.success) {
      console.error('Payload validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload structure',
          details: validationResult.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }),
        {
          status: 400,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validatedPayload = validationResult.data;
    console.log('Received Teams webhook with', validatedPayload.value.length, 'events');

    if (validatedPayload.value.length === 0) {
      return new Response(JSON.stringify({ message: 'No events in payload' }), {
        status: 200,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature using clientState from first event
    const clientState = validatedPayload.value[0].clientState;
    const isValid = await verifyWebhookSignature(clientState);
    
    if (!isValid) {
      console.error('Webhook signature verification failed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each event
    for (const event of validatedPayload.value) {
      const { resourceData, changeType, tenantId } = event;
      const organizerEmail = resourceData.organizer?.emailAddress?.address;
      
      // Map to workspace
      const mapping = await mapToWorkspace(supabase, tenantId, organizerEmail);
      
      if (!mapping) {
        console.log('Skipping event - no workspace mapping found');
        continue;
      }

      const { workspaceId, userId } = mapping;
      
      // Handle different event types
      if (changeType === 'created' && resourceData['@odata.type'] === '#microsoft.graph.event') {
        await handleMeetingCreated(supabase, resourceData, workspaceId, userId);
      } else if (changeType === 'updated' && resourceData['@odata.type'] === '#microsoft.graph.event') {
        await handleMeetingUpdated(supabase, resourceData);
      } else if (changeType === 'deleted' && resourceData['@odata.type'] === '#microsoft.graph.event') {
        await handleMeetingDeleted(supabase, resourceData);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      {
        status: 200,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing Teams webhook:', error);
    const errorMessage = error instanceof Error ? sanitizeString(error.message) : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleMeetingCreated(
  supabase: SupabaseClient, 
  meetingData: TeamsResourceData,
  workspaceId: string,
  userId: string
) {
  console.log('Handling meeting created:', meetingData.subject);

  const teamsId = meetingData.id;
  const title = meetingData.subject;
  const description = meetingData.bodyPreview;
  const start = meetingData.start;

  if (!teamsId) {
    console.error('Meeting data missing ID');
    return;
  }

  // Create meeting record with sanitized inputs
  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      workspace_id: workspaceId,
      title: sanitizeTextContent(title || 'Teams Meeting'),
      description: sanitizeTextContent(description || ''),
      scheduled_at: start?.dateTime ? new Date(start.dateTime).toISOString() : null,
      status: 'scheduled',
      teams_meeting_id: teamsId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    return;
  }

  console.log('Meeting created successfully:', meeting.id);
}

async function handleMeetingUpdated(
  supabase: SupabaseClient, 
  meetingData: TeamsResourceData
) {
  console.log('Handling meeting updated:', meetingData.subject);

  const teamsId = meetingData.id;
  const subject = meetingData.subject;
  const bodyPreview = meetingData.bodyPreview;
  const start = meetingData.start;

  if (!teamsId) {
    console.error('Meeting data missing ID');
    return;
  }

  // Find existing meeting
  const { data: existingMeeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('teams_meeting_id', teamsId)
    .single();

  if (!existingMeeting) {
    console.log('Meeting not found for update');
    return;
  }

  // Update meeting with sanitized inputs
  const { error } = await supabase
    .from('meetings')
    .update({
      title: sanitizeTextContent(subject || 'Teams Meeting'),
      description: sanitizeTextContent(bodyPreview || ''),
      scheduled_at: start?.dateTime ? new Date(start.dateTime).toISOString() : null,
    })
    .eq('id', existingMeeting.id);

  if (error) {
    console.error('Error updating meeting:', error);
    return;
  }

  console.log('Meeting updated successfully');
}

async function handleMeetingDeleted(
  supabase: SupabaseClient, 
  meetingData: TeamsResourceData
) {
  console.log('Handling meeting deleted:', meetingData.id);

  const teamsId = meetingData.id;

  if (!teamsId) {
    console.error('Meeting data missing ID');
    return;
  }

  // Find and update meeting status
  const { error } = await supabase
    .from('meetings')
    .update({ status: 'cancelled' })
    .eq('teams_meeting_id', teamsId);

  if (error) {
    console.error('Error cancelling meeting:', error);
    return;
  }

  console.log('Meeting cancelled successfully');
}
