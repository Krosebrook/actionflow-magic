import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { KeyRound, Mail, HelpCircle, CheckCircle } from "lucide-react";
import { z } from "zod";

interface AccountRecoverySetupProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const securityQuestions = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is the name of your favorite teacher?",
  "What was the make of your first car?",
  "What is your mother's maiden name?",
];

const emailSchema = z.string().email("Please enter a valid email address");

export const AccountRecoverySetup = ({
  userId,
  open,
  onOpenChange,
}: AccountRecoverySetupProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [emailError, setEmailError] = useState("");
  const [hasExistingSettings, setHasExistingSettings] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchSettings();
    }
  }, [open, userId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_recovery")
      .select("recovery_email, security_question")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setRecoveryEmail(data.recovery_email || "");
      setSecurityQuestion(data.security_question || "");
      setHasExistingSettings(true);
    }
    setLoading(false);
  };

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("");
      return true;
    }
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return false;
    }
    setEmailError("");
    return true;
  };

  const hashAnswer = async (answer: string): Promise<string> => {
    // Simple hash for demo - in production use bcrypt via edge function
    const encoder = new TextEncoder();
    const data = encoder.encode(answer.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSave = async () => {
    if (recoveryEmail && !validateEmail(recoveryEmail)) return;

    if (securityQuestion && !securityAnswer.trim()) {
      toast({
        variant: "destructive",
        title: "Missing answer",
        description: "Please provide an answer to your security question",
      });
      return;
    }

    setSaving(true);

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("user_recovery")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const updateData = {
        recovery_email: recoveryEmail || null,
        security_question: securityQuestion || null,
        security_answer_hash: securityAnswer.trim() ? await hashAnswer(securityAnswer) : undefined,
      };

      let error;
      if (existing) {
        const result = await supabase
          .from("user_recovery")
          .update(updateData)
          .eq("user_id", userId);
        error = result.error;
      } else {
        const result = await supabase
          .from("user_recovery")
          .insert({ user_id: userId, ...updateData });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your account recovery options have been updated.",
      });
      setSecurityAnswer("");
      setHasExistingSettings(true);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEmailError("");
    setSecurityAnswer("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Account Recovery Options
          </DialogTitle>
          <DialogDescription>
            Set up recovery options to regain access to your account if needed
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {hasExistingSettings && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                Recovery options configured
              </div>
            )}

            {/* Recovery Email */}
            <div className="space-y-2">
              <Label htmlFor="recovery-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Recovery Email
              </Label>
              <Input
                id="recovery-email"
                type="email"
                placeholder="backup@example.com"
                value={recoveryEmail}
                onChange={(e) => {
                  setRecoveryEmail(e.target.value);
                  validateEmail(e.target.value);
                }}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We'll send recovery instructions to this email if you lose access
              </p>
            </div>

            {/* Security Question */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Security Question
              </Label>
              <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a security question" />
                </SelectTrigger>
                <SelectContent>
                  {securityQuestions.map((question) => (
                    <SelectItem key={question} value={question}>
                      {question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {securityQuestion && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="security-answer">Your Answer</Label>
                  <Input
                    id="security-answer"
                    type="text"
                    placeholder="Enter your answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {hasExistingSettings
                      ? "Leave blank to keep your existing answer"
                      : "This answer will be hashed and stored securely"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
