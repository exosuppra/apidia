-- Create user_requests table for storing modification requests
CREATE TABLE IF NOT EXISTS public.user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_id_sheet TEXT,
  fiche_id TEXT NOT NULL,
  original_data JSONB,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_action_logs table for tracking user activities
CREATE TABLE IF NOT EXISTS public.user_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_id_sheet TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'logout', 'view_fiches', 'request_update', 'set_code', 'view_details')),
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_action_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_requests
CREATE POLICY "Admins can view all requests"
  ON public.user_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
  ON public.user_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete requests"
  ON public.user_requests
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_action_logs
CREATE POLICY "Admins can view all action logs"
  ON public.user_action_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_requests_status ON public.user_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_requests_created_at ON public.user_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_requests_user_email ON public.user_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_email ON public.user_action_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_action_type ON public.user_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_created_at ON public.user_action_logs(created_at DESC);