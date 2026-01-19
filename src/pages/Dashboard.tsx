import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LogOut, Settings, Users, Calendar, CheckSquare, Shield, KeyRound, FileText, Lock, Laptop } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { AccountRecoverySetup } from "@/components/AccountRecoverySetup";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { SessionManagement } from "@/components/SessionManagement";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showRecoverySetup, setShowRecoverySetup] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const { workspaceId } = useWorkspace();
  
  // Enable session timeout - auto logout after 30 min of inactivity
  useSessionTimeout({ enabled: true });
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">ActionFlow</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setShowSessions(true)}>
                <Laptop className="w-4 h-4 mr-2" />
                Sessions
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordChange(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Password
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRecoverySetup(true)}>
                <KeyRound className="w-4 h-4 mr-2" />
                Recovery
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShow2FASetup(true)}>
                <Shield className="w-4 h-4 mr-2" />
                2FA
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/integrations")}>
                <Settings className="w-4 h-4 mr-2" />
                Integrations
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </h2>
          <p className="text-muted-foreground">
            Manage your meetings, tasks, and team collaboration
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="security">
              <FileText className="w-4 h-4 mr-1" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">No meetings yet</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">All caught up!</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1</div>
                  <p className="text-xs text-muted-foreground">Just you for now</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with your first meeting or task</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" onClick={() => navigate("/meetings/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule New Meeting
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/tasks/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-foreground">Meetings</h3>
              <Button onClick={() => navigate("/meetings/new")}>
                <Plus className="w-4 h-4 mr-2" />
                New Meeting
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No meetings scheduled yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-foreground">Tasks</h3>
              <Button onClick={() => navigate("/tasks/new")}>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No tasks created yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-foreground">Team</h3>
              <Button onClick={() => toast({ title: "Coming soon!" })}>
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Set up your workspace to invite team members</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <AuditLogViewer workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </div>

      {user && (
        <>
          <TwoFactorSetup
            userId={user.id}
            userEmail={user.email || ""}
            open={show2FASetup}
            onOpenChange={setShow2FASetup}
          />
          <AccountRecoverySetup
            userId={user.id}
            open={showRecoverySetup}
            onOpenChange={setShowRecoverySetup}
          />
          <PasswordChangeDialog
            userId={user.id}
            userEmail={user.email || ""}
            open={showPasswordChange}
            onOpenChange={setShowPasswordChange}
          />
          {showSessions && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-2xl">
                <SessionManagement />
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={() => setShowSessions(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
