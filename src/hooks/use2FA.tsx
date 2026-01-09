import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as OTPAuth from "otpauth";
import { notifySecurityEvent } from "@/lib/securityNotifications";
interface User2FA {
  id: string;
  user_id: string;
  totp_secret: string | null;
  is_enabled: boolean;
  backup_codes: string[] | null;
}

export const use2FA = (userId: string | undefined) => {
  const [settings, setSettings] = useState<User2FA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const fetchSettings = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from("user_2fa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const generateSecret = () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
  };

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const getTOTPUri = (secret: string, email: string) => {
    const totp = new OTPAuth.TOTP({
      issuer: "ActionFlow",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.toString();
  };

  const verifyCode = (secret: string, code: string): boolean => {
    const totp = new OTPAuth.TOTP({
      issuer: "ActionFlow",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  };

  const enable2FA = async (secret: string, backupCodes: string[]) => {
    if (!userId) return { error: "User not found" };

    const { error } = await supabase
      .from("user_2fa")
      .upsert({
        user_id: userId,
        totp_secret: secret,
        is_enabled: true,
        backup_codes: backupCodes,
      });

    if (!error) {
      await fetchSettings();
      // Send security notification
      notifySecurityEvent({
        userId,
        eventType: "2fa_enabled",
      });
    }
    return { error: error?.message };
  };

  const disable2FA = async () => {
    if (!userId) return { error: "User not found" };

    const { error } = await supabase
      .from("user_2fa")
      .update({
        is_enabled: false,
        totp_secret: null,
        backup_codes: null,
      })
      .eq("user_id", userId);

    if (!error) {
      await fetchSettings();
      // Send security notification
      notifySecurityEvent({
        userId,
        eventType: "2fa_disabled",
      });
    }
    return { error: error?.message };
  };

  const useBackupCode = async (code: string): Promise<boolean> => {
    if (!settings?.backup_codes) return false;
    
    const upperCode = code.toUpperCase();
    const codeIndex = settings.backup_codes.indexOf(upperCode);
    
    if (codeIndex === -1) return false;

    const newCodes = [...settings.backup_codes];
    newCodes.splice(codeIndex, 1);

    await supabase
      .from("user_2fa")
      .update({ backup_codes: newCodes })
      .eq("user_id", userId);

    return true;
  };

  return {
    settings,
    loading,
    generateSecret,
    generateBackupCodes,
    getTOTPUri,
    verifyCode,
    enable2FA,
    disable2FA,
    useBackupCode,
    refetch: fetchSettings,
  };
};

export const check2FAEnabled = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_2fa")
    .select("is_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.is_enabled ?? false;
};
