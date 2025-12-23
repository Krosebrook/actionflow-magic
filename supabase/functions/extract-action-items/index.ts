import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createAuditLogger } from "../_shared/audit-logger.ts";
import { checkRequestSize, getContentLength, formatBytes } from "../_shared/request-size-limiter.ts";

const FUNCTION_NAME = 'extract-action-items';

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

// Sanitize action items array
function sanitizeActionItems(items: { tasks: Array<{ title: string; description?: string; assignee?: string; priority: string; dueDate?: string }> }): typeof items {
  return {
    tasks: items.tasks.map(task => ({
      ...task,
      title: sanitizeTextContent(task.title),
      description: task.description ? sanitizeTextContent(task.description) : undefined,
      assignee: task.assignee ? sanitizeTextContent(task.assignee) : undefined,
    }))
  };
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per IP

// In-memory rate limit store
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

// Input validation schema
const ExtractActionItemsSchema = z.object({
  transcript: z.string()
    .min(1, 'Transcript cannot be empty')
    .max(500000, 'Transcript exceeds maximum length of 500,000 characters'),
  meetingId: z.string()
    .uuid('Invalid meeting ID format')
    .optional(),
});

serve(async (req) => {
  const auditLogger = createAuditLogger(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: securityHeaders });
  }

  const clientIP = getClientIP(req);

  // Request size limit check
  const contentLength = getContentLength(req);
  const sizeResult = checkRequestSize(contentLength, FUNCTION_NAME);
  
  if (!sizeResult.allowed) {
    console.warn(`Request size exceeded for IP: ${clientIP}, size: ${formatBytes(sizeResult.size)}, limit: ${formatBytes(sizeResult.limit)}`);
    await auditLogger.logRequestSizeExceeded(FUNCTION_NAME, sizeResult.size, sizeResult.limit);
    return new Response(
      JSON.stringify({ 
        error: 'Request too large',
        details: `Maximum request size is ${formatBytes(sizeResult.limit)}`,
      }),
      {
        status: 413,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Rate limiting check
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    await auditLogger.logRateLimit(FUNCTION_NAME);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
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
    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = ExtractActionItemsSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      await auditLogger.logValidationFailed(FUNCTION_NAME, validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        {
          status: 400,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { transcript, meetingId } = validationResult.data;
    console.log('Extracting action items for meeting:', meetingId || 'no meeting ID');

    // Log data access
    await auditLogger.log({
      event_type: 'data_access',
      event_category: 'data',
      resource_type: 'meeting',
      resource_id: meetingId,
      severity: 'info',
      details: { action: 'extract_action_items' },
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: Record<string, unknown> = {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that extracts action items from meeting transcripts. Identify tasks, who should do them, and any deadlines mentioned.',
        },
        {
          role: 'user',
          content: `Extract action items from this transcript:\n\n${transcript}`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_tasks',
            description: 'Extract action items and tasks from a meeting transcript',
            parameters: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'The task title' },
                      description: { type: 'string', description: 'Detailed description' },
                      assignee: { type: 'string', description: 'Person assigned (or "unassigned")' },
                      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                      dueDate: { type: 'string', description: 'Due date if mentioned, otherwise null' },
                    },
                    required: ['title', 'priority'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['tasks'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'extract_tasks' } },
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      await auditLogger.logApiError(FUNCTION_NAME, `AI Gateway error: ${response.status}`);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call returned from AI');
    }

    const actionItems = JSON.parse(toolCall.function.arguments);
    // Sanitize action items output to prevent XSS
    const sanitizedItems = sanitizeActionItems(actionItems);
    console.log('Extracted action items:', sanitizedItems);

    return new Response(
      JSON.stringify(sanitizedItems),
      {
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in extract-action-items function:', error);
    const errorMessage = error instanceof Error ? sanitizeString(error.message) : 'Unknown error';
    await auditLogger.logApiError(FUNCTION_NAME, errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});