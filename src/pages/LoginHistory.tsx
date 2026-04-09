import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Monitor, Smartphone, Tablet, MapPin, Clock, Globe, Shield } from "lucide-react";
import { format } from "date-fns";

interface LoginSession {
  id: string;
  ip_address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_current: boolean | null;
  is_revoked: boolean | null;
  created_at: string;
  last_active_at: string;
  expires_at: string | null;
}

const DeviceIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case "Mobile": return <Smartphone className="w-5 h-5" />;
    case "Tablet": return <Tablet className="w-5 h-5" />;
    default: return <Monitor className="w-5 h-5" />;
  }
};

const LoginHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchSessions(session.user.id);
    });
  }, [navigate]);

  const fetchSessions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions((data as LoginSession[]) || []);
    } catch (err) {
      console.error("Failed to fetch login history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (session: LoginSession) => {
    if (session.is_revoked) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (session.is_current) {
      return <Badge className="bg-green-600 hover:bg-green-700">Current</Badge>;
    }
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
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
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Login History</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Recent Login Activity</h2>
            <p className="text-sm text-muted-foreground">
              Review all login attempts to your account
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No login history found.
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className={session.is_current ? "border-primary/40" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 rounded-lg bg-muted">
                        <DeviceIcon type={session.device_type} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {session.browser || "Unknown"} on {session.os || "Unknown"}
                          </span>
                          {getStatusBadge(session)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {[session.city, session.region, session.country]
                              .filter(Boolean)
                              .join(", ") || "Unknown location"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {session.ip_address || "Unknown IP"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(session.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <span className="capitalize">{session.device_type || "Desktop"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginHistory;
