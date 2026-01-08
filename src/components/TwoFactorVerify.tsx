import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Shield, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as OTPAuth from "otpauth";

interface TwoFactorVerifyProps {
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const TwoFactorVerify = ({ userId, onVerified, onCancel }: TwoFactorVerifyProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const verifyTOTP = async () => {
    setLoading(true);

    try {
      const { data: settings } = await supabase
        .from("user_2fa")
        .select("totp_secret, backup_codes")
        .eq("user_id", userId)
        .single();

      if (!settings?.totp_secret) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "2FA settings not found",
        });
        setLoading(false);
        return;
      }

      if (useBackup) {
        // Verify backup code
        const upperCode = code.toUpperCase();
        if (settings.backup_codes?.includes(upperCode)) {
          // Remove used backup code
          const newCodes = settings.backup_codes.filter((c: string) => c !== upperCode);
          await supabase
            .from("user_2fa")
            .update({ backup_codes: newCodes })
            .eq("user_id", userId);

          toast({
            title: "Backup code used",
            description: `${newCodes.length} backup codes remaining`,
          });
          onVerified();
        } else {
          toast({
            variant: "destructive",
            title: "Invalid code",
            description: "The backup code is incorrect or has already been used",
          });
        }
      } else {
        // Verify TOTP
        const totp = new OTPAuth.TOTP({
          issuer: "ActionFlow",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(settings.totp_secret),
        });

        const delta = totp.validate({ token: code, window: 1 });

        if (delta !== null) {
          onVerified();
        } else {
          toast({
            variant: "destructive",
            title: "Invalid code",
            description: "The verification code is incorrect. Please try again.",
          });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify code",
      });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
          <Shield className="h-6 w-6" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-center">
          {useBackup
            ? "Enter one of your backup codes"
            : "Enter the code from your authenticator app"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="2fa-code">
            {useBackup ? "Backup Code" : "Verification Code"}
          </Label>
          <Input
            id="2fa-code"
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            pattern={useBackup ? undefined : "[0-9]*"}
            maxLength={useBackup ? 6 : 6}
            placeholder={useBackup ? "XXXXXX" : "000000"}
            value={code}
            onChange={(e) => setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-widest"
            autoFocus
          />
        </div>

        <Button
          onClick={verifyTOTP}
          disabled={loading || code.length < 6}
          className="w-full"
        >
          {loading ? "Verifying..." : "Verify"}
        </Button>

        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setUseBackup(!useBackup);
              setCode("");
            }}
            className="w-full text-sm"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {useBackup ? "Use authenticator app" : "Use a backup code"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
