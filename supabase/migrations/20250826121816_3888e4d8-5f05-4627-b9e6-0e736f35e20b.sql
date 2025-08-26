-- Create table to store Google credentials per user
CREATE TABLE public.user_google_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_client_id TEXT NOT NULL,
  google_client_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_google_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own Google credentials" 
ON public.user_google_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Google credentials" 
ON public.user_google_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google credentials" 
ON public.user_google_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google credentials" 
ON public.user_google_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_google_credentials_updated_at
BEFORE UPDATE ON public.user_google_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to store Google access tokens per user
CREATE TABLE public.user_google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own Google tokens" 
ON public.user_google_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Google tokens" 
ON public.user_google_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google tokens" 
ON public.user_google_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google tokens" 
ON public.user_google_tokens 
FOR DELETE 
USING (auth.uid() = user_id);