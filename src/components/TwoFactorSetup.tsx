import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import { useToast } from "@/components/ui/use-toast";
import { use2FA } from "@/hooks/use2FA";
import { Shield, Copy, CheckCircle } from "lucide-react";

interface TwoFactorSetupProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TwoFactorSetup = ({
  userId,
  userEmail,
  open,
  onOpenChange,
}: TwoFactorSetupProps) => {
  const { toast } = useToast();
  const {
    settings,
    generateSecret,
    generateBackupCodes,
    getTOTPUri,
    verifyCode,
    enable2FA,
    disable2FA,
  } = use2FA(userId);

  const [step, setStep] = useState<"intro" | "scan" | "verify" | "backup" | "complete">("intro");
  const [tempSecret, setTempSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleStart = () => {
    const secret = generateSecret();
    const codes = generateBackupCodes();
    setTempSecret(secret);
    setBackupCodes(codes);
    setStep("scan");
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter a 6-digit code",
      });
      return;
    }

    setLoading(true);
    const isValid = verifyCode(tempSecret, verificationCode);

    if (isValid) {
      setStep("backup");
    } else {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "The code you entered is incorrect. Please try again.",
      });
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    const { error } = await enable2FA(tempSecret, backupCodes);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      setStep("complete");
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication is now active on your account.",
      });
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    const { error } = await disable2FA();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
      onOpenChange(false);
    }
    setLoading(false);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });
  };

  const handleClose = () => {
    setStep("intro");
    setTempSecret("");
    setBackupCodes([]);
    setVerificationCode("");
    setCopiedCodes(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {settings?.is_enabled
              ? "Manage your 2FA settings"
              : "Add an extra layer of security to your account"}
          </DialogDescription>
        </DialogHeader>

        {settings?.is_enabled && step === "intro" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>2FA is currently enabled</span>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </div>
        ) : (
          <>
            {step === "intro" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app like Google Authenticator, Authy, or
                  1Password to scan a QR code and generate verification codes.
                </p>
                <Button onClick={handleStart} className="w-full">
                  Set up 2FA
                </Button>
              </div>
            )}

            {step === "scan" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app:
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={getTOTPUri(tempSecret, userEmail)}
                    size={200}
                    level="M"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Or enter this code manually:
                  </Label>
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {tempSecret}
                  </code>
                </div>
                <Button onClick={() => setStep("verify")} className="w-full">
                  Continue
                </Button>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, ""))
                    }
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep("scan")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVerify}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            )}

            {step === "backup" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Save these backup codes in a secure place. You can use them to
                  access your account if you lose your authenticator device.
                </p>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={copyBackupCodes}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copiedCodes ? "Copied!" : "Copy codes"}
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Enabling..." : "Enable 2FA"}
                </Button>
              </div>
            )}

            {step === "complete" && (
              <div className="space-y-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication is now enabled. You'll need to enter
                  a code from your authenticator app when you sign in.
                </p>
                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
