import { supabase } from '@/integrations/supabase/client';

export async function trackLoginSession(userId: string): Promise<void> {
  try {
    const sessionToken = crypto.randomUUID();
    
    await supabase.functions.invoke('track-login-session', {
      body: { 
        user_id: userId, 
        session_token: sessionToken,
      },
    });
  } catch (error) {
    console.error('Failed to track login session:', error);
    // Don't throw - session tracking should not break login flow
  }
}

export async function revokeSession(userId: string, sessionToken: string): Promise<boolean> {
  try {
    const response = await supabase.functions.invoke('track-login-session', {
      body: { 
        user_id: userId, 
        session_token: sessionToken,
        action: 'revoke',
      },
    });

    return !response.error;
  } catch (error) {
    console.error('Failed to revoke session:', error);
    return false;
  }
}
