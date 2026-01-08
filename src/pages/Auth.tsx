import { useState } from "react";
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

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending2FA, setPending2FA] = useState<{ userId: string } | null>(null);
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
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
