import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const IntegrationsSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teams-webhook`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    // Load workspace and integration status
    loadWorkspaceData();
  }, [navigate]);

  const loadWorkspaceData = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      // Get user's workspace
      const { data: workspaces } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.session.user.id)
        .limit(1);

      if (workspaces && workspaces.length > 0) {
        const wsId = workspaces[0].workspace_id;
        setWorkspaceId(wsId);

        // Check if Teams integration exists
        const { data: integration } = await supabase
          .from("integrations")
          .select("*")
          .eq("workspace_id", wsId)
          .eq("integration_type", "teams")
          .single();

        if (integration) {
          setTeamsEnabled(integration.is_active);
        }
      }
    } catch (error) {
      console.error("Error loading workspace data:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  const handleEnableTeams = async () => {
    if (!workspaceId || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Workspace not found. Please create a workspace first.",
      });
      return;
    }

    try {
      const { error } = await supabase.from("integrations").upsert({
        workspace_id: workspaceId,
        integration_type: "teams",
        is_active: true,
        config: { webhook_enabled: true },
        created_by: user.id,
      });

      if (error) throw error;

      setTeamsEnabled(true);
      toast({
        title: "Success!",
        description: "Microsoft Teams integration enabled",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Integrations Setup</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Microsoft Teams Integration
                  {teamsEnabled && <Check className="w-5 h-5 text-primary" />}
                </CardTitle>
                <CardDescription className="mt-2">
                  Automatically capture meetings and sync tasks with Microsoft Teams
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!teamsEnabled ? (
              <>
                <Alert>
                  <AlertDescription>
                    Follow the steps below to set up Microsoft Teams webhook integration. This will allow
                    ActionFlow to automatically capture your Teams meetings and extract action items.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Step 1: Enable Integration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click the button below to activate Teams integration for your workspace.
                    </p>
                    <Button onClick={handleEnableTeams}>Enable Microsoft Teams</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Microsoft Teams integration is active
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Step 2: Configure Microsoft Teams Webhook</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Copy the webhook URL below and configure it in your Microsoft Teams admin center.
                    </p>
                    
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="webhook-url"
                        value={webhookUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(webhookUrl)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Step 3: Register the Webhook in Microsoft Teams</h3>
                    <ol className="space-y-3 text-sm text-muted-foreground ml-4 list-decimal">
                      <li>
                        Go to the{" "}
                        <a
                          href="https://admin.teams.microsoft.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Microsoft Teams Admin Center
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Navigate to <strong>Apps → Manage apps → Create a custom app</strong></li>
                      <li>Set up a new app registration with webhook capabilities</li>
                      <li>Add the webhook URL above as your notification endpoint</li>
                      <li>
                        Subscribe to these events:
                        <ul className="ml-4 mt-2 space-y-1">
                          <li>• <code>microsoft.graph.event.created</code></li>
                          <li>• <code>microsoft.graph.event.updated</code></li>
                          <li>• <code>microsoft.graph.event.deleted</code></li>
                        </ul>
                      </li>
                      <li>Grant the app permissions for calendar events in your organization</li>
                      <li>Approve and activate the app</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Step 4: Test the Integration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a test meeting in Microsoft Teams to verify the webhook is working correctly.
                      The meeting should appear automatically in your ActionFlow dashboard.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                      View Dashboard
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Note:</strong> Webhook setup requires Microsoft 365 admin permissions. Contact your
                    IT administrator if you don't have access to the Teams Admin Center.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Additional Integrations</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border border-border rounded-lg opacity-60">
                <h4 className="font-semibold mb-1">Slack</h4>
                <p className="text-sm text-muted-foreground">Post meeting summaries to channels</p>
              </div>
              <div className="p-4 border border-border rounded-lg opacity-60">
                <h4 className="font-semibold mb-1">Jira</h4>
                <p className="text-sm text-muted-foreground">Sync tasks as Jira issues</p>
              </div>
              <div className="p-4 border border-border rounded-lg opacity-60">
                <h4 className="font-semibold mb-1">Asana</h4>
                <p className="text-sm text-muted-foreground">Create Asana tasks from action items</p>
              </div>
              <div className="p-4 border border-border rounded-lg opacity-60">
                <h4 className="font-semibold mb-1">Linear</h4>
                <p className="text-sm text-muted-foreground">Sync with Linear issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationsSetup;
