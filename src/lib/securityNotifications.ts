import { supabase } from "@/integrations/supabase/client";

type SecurityEventType = 
  | "new_login" 
  | "password_change" 
  | "2fa_enabled" 
  | "2fa_disabled" 
  | "recovery_updated";

interface NotifySecurityEventParams {
  userId: string;
  eventType: SecurityEventType;
  metadata?: Record<string, string>;
}

export const notifySecurityEvent = async ({
  userId,
  eventType,
  metadata,
}: NotifySecurityEventParams): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke("send-security-email", {
      body: { userId, eventType, metadata },
    });

    if (error) {
      console.error("Failed to send security notification:", error);
    }
  } catch (err) {
    // Don't throw - security notifications should not break the main flow
    console.error("Error sending security notification:", err);
  }
};
