import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const useWorkspace = () => {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrCreateWorkspace();
  }, []);

  const loadOrCreateWorkspace = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Check if user has a workspace
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .limit(1);

      if (memberData && memberData.length > 0) {
        setWorkspaceId(memberData[0].workspace_id);
        setLoading(false);
        return;
      }

      // Create default workspace for user
      const { data: newWorkspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: `${session.user.email?.split('@')[0]}'s Workspace`,
          owner_id: session.user.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add user as owner member
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: newWorkspace.id,
          user_id: session.user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      setWorkspaceId(newWorkspace.id);
      toast({
        title: "Workspace created",
        description: "Your default workspace has been set up",
      });
    } catch (error: any) {
      console.error("Error with workspace:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return { workspaceId, loading };
};
