import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle Teams validation challenge
    const url = new URL(req.url);
    const validationToken = url.searchParams.get('validationToken');
    
    if (validationToken) {
      console.log('Handling Teams validation challenge');
      return new Response(validationToken, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log('Received Teams webhook:', JSON.stringify(payload, null, 2));

    // Extract event type and data
    const { value } = payload;
    
    if (!value || value.length === 0) {
      return new Response(JSON.stringify({ message: 'No events in payload' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each event
    for (const event of value) {
      const { resourceData, changeType } = event;
      
      // Handle different event types
      if (changeType === 'created' && resourceData['@odata.type'] === '#microsoft.graph.event') {
        await handleMeetingCreated(supabase, resourceData);
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing Teams webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleMeetingCreated(supabase: any, meetingData: any) {
  console.log('Handling meeting created:', meetingData.subject);

  // Extract meeting details
  const {
    id: teamsId,
    subject: title,
    bodyPreview: description,
    start,
    end,
    organizer,
    onlineMeeting,
  } = meetingData;

  // Find or create workspace for the organizer
  // For now, we'll use the first workspace we find
  // In production, you'd match based on email domain or user mapping
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1);

  if (!workspaces || workspaces.length === 0) {
    console.log('No workspace found to create meeting');
    return;
  }

  const workspaceId = workspaces[0].id;

  // Get the creator user (service account or mapped user)
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('No user found to create meeting');
    return;
  }

  const userId = users[0].id;

  // Create meeting record
  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      workspace_id: workspaceId,
      title: title || 'Teams Meeting',
      description: description || '',
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

async function handleMeetingUpdated(supabase: any, meetingData: any) {
  console.log('Handling meeting updated:', meetingData.subject);

  const { id: teamsId, subject, bodyPreview, start, end } = meetingData;

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

  // Update meeting
  const { error } = await supabase
    .from('meetings')
    .update({
      title: subject || 'Teams Meeting',
      description: bodyPreview || '',
      scheduled_at: start?.dateTime ? new Date(start.dateTime).toISOString() : null,
    })
    .eq('id', existingMeeting.id);

  if (error) {
    console.error('Error updating meeting:', error);
    return;
  }

  console.log('Meeting updated successfully');
}

async function handleMeetingDeleted(supabase: any, meetingData: any) {
  console.log('Handling meeting deleted:', meetingData.id);

  const { id: teamsId } = meetingData;

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
