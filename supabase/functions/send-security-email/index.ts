import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SecurityEventType = 
  | "new_login" 
  | "password_change" 
  | "2fa_enabled" 
  | "2fa_disabled" 
  | "recovery_updated";

interface SecurityEmailRequest {
  userId: string;
  eventType: SecurityEventType;
  metadata?: Record<string, string>;
}

const getEmailContent = (eventType: SecurityEventType, metadata?: Record<string, string>) => {
  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const templates: Record<SecurityEventType, { subject: string; html: string }> = {
    new_login: {
      subject: "🔐 New Sign-In to Your ActionFlow Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">New Sign-In Detected</h1>
          <p>We noticed a new sign-in to your ActionFlow account.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
            ${metadata?.location ? `<p style="margin: 8px 0 0;"><strong>Location:</strong> ${metadata.location}</p>` : ""}
            ${metadata?.device ? `<p style="margin: 8px 0 0;"><strong>Device:</strong> ${metadata.device}</p>` : ""}
          </div>
          <p>If this was you, no action is needed. If you didn't sign in, please secure your account immediately by changing your password and enabling 2FA.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The ActionFlow Security Team</p>
        </div>
      `,
    },
    password_change: {
      subject: "🔑 Your ActionFlow Password Was Changed",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Password Changed</h1>
          <p>Your ActionFlow account password was successfully changed.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
          </div>
          <p>If you made this change, no further action is needed.</p>
          <p style="color: #dc2626;"><strong>If you didn't make this change, your account may be compromised.</strong> Please reset your password immediately and contact support.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The ActionFlow Security Team</p>
        </div>
      `,
    },
    "2fa_enabled": {
      subject: "✅ Two-Factor Authentication Enabled",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">2FA Successfully Enabled</h1>
          <p>Two-factor authentication has been enabled on your ActionFlow account.</p>
          <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;"><strong>Your account is now more secure!</strong></p>
            <p style="margin: 8px 0 0;"><strong>Time:</strong> ${timestamp}</p>
          </div>
          <p>Make sure to keep your backup codes in a safe place. You'll need them if you lose access to your authenticator app.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The ActionFlow Security Team</p>
        </div>
      `,
    },
    "2fa_disabled": {
      subject: "⚠️ Two-Factor Authentication Disabled",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">2FA Has Been Disabled</h1>
          <p>Two-factor authentication has been disabled on your ActionFlow account.</p>
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Your account is now less secure.</strong></p>
            <p style="margin: 8px 0 0;"><strong>Time:</strong> ${timestamp}</p>
          </div>
          <p>If you didn't make this change, please secure your account immediately.</p>
          <p>We recommend re-enabling 2FA as soon as possible to protect your account.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The ActionFlow Security Team</p>
        </div>
      `,
    },
    recovery_updated: {
      subject: "🔄 Account Recovery Options Updated",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Recovery Options Updated</h1>
          <p>Your ActionFlow account recovery options have been updated.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
          </div>
          <p>If you made this change, no further action is needed.</p>
          <p>If you didn't make this change, please review your account settings immediately.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The ActionFlow Security Team</p>
        </div>
      `,
    },
  };

  return templates[eventType];
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, eventType, metadata }: SecurityEmailRequest = await req.json();

    if (!userId || !eventType) {
      console.error("Missing required fields:", { userId, eventType });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user email from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailContent = getEmailContent(eventType, metadata);
    
    console.log(`Sending ${eventType} security email to ${profile.email}`);

    const emailResponse = await resend.emails.send({
      from: "ActionFlow Security <onboarding@resend.dev>",
      to: [profile.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the security event to audit_logs
    await supabase.from("audit_logs").insert({
      user_id: userId,
      event_type: `security_email_${eventType}`,
      event_category: "security",
      severity: eventType.includes("disabled") ? "warning" : "info",
      details: { eventType, metadata },
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-security-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
