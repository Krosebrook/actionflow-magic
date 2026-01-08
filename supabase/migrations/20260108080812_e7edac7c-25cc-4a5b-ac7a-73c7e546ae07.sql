-- Create table for 2FA settings
CREATE TABLE public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  totp_secret TEXT,
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

-- Users can only view/update their own 2FA settings
CREATE POLICY "Users can view own 2FA settings"
ON public.user_2fa
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA settings"
ON public.user_2fa
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings"
ON public.user_2fa
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_2fa_updated_at
BEFORE UPDATE ON public.user_2fa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_2fa_user_id ON public.user_2fa(user_id);