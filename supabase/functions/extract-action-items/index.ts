import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = ExtractActionItemsSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { transcript, meetingId } = validationResult.data;
    console.log('Extracting action items for meeting:', meetingId || 'no meeting ID');

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
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call returned from AI');
    }

    const actionItems = JSON.parse(toolCall.function.arguments);
    console.log('Extracted action items:', actionItems);

    return new Response(
      JSON.stringify(actionItems),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in extract-action-items function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
