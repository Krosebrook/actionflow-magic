-- Create a security definer function to check workspace membership
-- This avoids the infinite recursion issue in RLS policies
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
  )
$$;

-- Create a function to check if user is workspace owner or admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Drop existing problematic policies on workspace_members
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update members" ON public.workspace_members;

-- Recreate policies using the security definer functions
CREATE POLICY "Users can view members of their workspaces" 
ON public.workspace_members 
FOR SELECT 
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners and admins can add members" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners and admins can update members" 
ON public.workspace_members 
FOR UPDATE 
USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- Fix the transcripts table INSERT policy to be more restrictive
-- Only allow inserts for meetings in workspaces the user is a member of
DROP POLICY IF EXISTS "System can insert transcripts" ON public.transcripts;

CREATE POLICY "Users can insert transcripts for their workspace meetings" 
ON public.transcripts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.meetings m
    JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
    WHERE m.id = meeting_id
      AND wm.user_id = auth.uid()
  )
);