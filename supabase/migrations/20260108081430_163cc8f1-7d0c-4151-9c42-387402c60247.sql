-- Create table for account recovery options
CREATE TABLE public.user_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  recovery_email TEXT,
  security_question TEXT,
  security_answer_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_recovery ENABLE ROW LEVEL SECURITY;

-- Users can only view/update their own recovery settings
CREATE POLICY "Users can view own recovery settings"
ON public.user_recovery
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery settings"
ON public.user_recovery
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery settings"
ON public.user_recovery
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_recovery_updated_at
BEFORE UPDATE ON public.user_recovery
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX idx_user_recovery_user_id ON public.user_recovery(user_id);
CREATE INDEX idx_user_recovery_email ON public.user_recovery(recovery_email);