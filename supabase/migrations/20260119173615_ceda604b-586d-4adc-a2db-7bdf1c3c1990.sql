-- Drop the overly permissive insert policy
DROP POLICY "Service role can insert sessions" ON public.user_sessions;

-- Create a proper insert policy - users can only insert sessions for themselves
-- The edge function will use service role key which bypasses RLS
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);