import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TwoFactorVerify } from "@/components/TwoFactorVerify";
import { check2FAEnabled } from "@/hooks/use2FA";
import { PasswordStrengthIndicator, validatePassword } from "@/components/PasswordStrengthIndicator";
import { useAuthRateLimit } from "@/hooks/useRateLimit";
import { notifySecurityEvent } from "@/lib/securityNotifications";
import { trackLoginSession } from "@/lib/sessionTracking";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending2FA, setPending2FA] = useState<{ userId: string } | null>(null);
  const { checkLimit, isLocked, timeUntilReset, remainingAttempts } = useAuthRateLimit();
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Update countdown timer during lockout
  useEffect(() => {
    if (isLocked && timeUntilReset > 0) {
      setLockoutCountdown(timeUntilReset);
      const interval = setInterval(() => {
        setLockoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, timeUntilReset]);
  const [passwordError, setPasswordError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength
    const { isValid, errors } = validatePassword(password);
    if (!isValid) {
      setPasswordError(errors[0]);
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: errors[0],
      });
      return;
    }
    setPasswordError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your account has been created. Redirecting to dashboard...",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit before attempting sign in
    if (!checkLimit()) {
      toast({
        variant: "destructive",
        title: "Too many attempts",
        description: `Please wait ${timeUntilReset} seconds before trying again.`,
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if 2FA is enabled for this user
      const has2FA = await check2FAEnabled(data.user.id);

      if (has2FA) {
        // Sign out temporarily and show 2FA verification
        await supabase.auth.signOut();
        setPending2FA({ userId: data.user.id });
      } else {
        // Track login session with location
        trackLoginSession(data.user.id);
        
        // Send login notification email
        notifySecurityEvent({
          userId: data.user.id,
          eventType: "new_login",
        });
        
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerified = async () => {
    // Re-sign in after 2FA verification
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete sign in",
      });
      setPending2FA(null);
      return;
    }

    // Get user ID for notification and session tracking
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      // Track login session with location
      trackLoginSession(sessionData.session.user.id);
      
      notifySecurityEvent({
        userId: sessionData.session.user.id,
        eventType: "new_login",
      });
    }

    toast({
      title: "Welcome back!",
      description: "Successfully signed in with 2FA.",
    });
    navigate("/dashboard");
  };

  const handle2FACancel = () => {
    setPending2FA(null);
    setPassword("");
  };

  // Show 2FA verification screen if pending
  if (pending2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[image:var(--gradient-subtle)] px-4">
        <TwoFactorVerify
          userId={pending2FA.userId}
          onVerified={handle2FAVerified}
          onCancel={handle2FACancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[image:var(--gradient-subtle)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">ActionFlow</CardTitle>
          <CardDescription className="text-center">
            Your meeting productivity platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Too many login attempts. Please wait {lockoutCountdown} seconds before trying again.
              </AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || isLocked}>
                  {loading ? "Signing in..." : isLocked ? `Wait ${lockoutCountdown}s` : "Sign In"}
                </Button>
                {remainingAttempts <= 2 && remainingAttempts > 0 && !isLocked && (
                  <p className="text-xs text-amber-600 text-center">
                    {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required
                  />
                  {passwordError && (
                    <p className="text-xs text-destructive">{passwordError}</p>
                  )}
                  <PasswordStrengthIndicator password={password} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
