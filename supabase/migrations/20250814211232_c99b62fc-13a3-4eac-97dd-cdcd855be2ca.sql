-- Create enum for action types
CREATE TYPE public.action_type AS ENUM ('view', 'create', 'update', 'delete', 'approve', 'reject');

-- Create admin_actions table for audit log
CREATE TABLE public.admin_actions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_email TEXT NOT NULL,
    action_type action_type NOT NULL,
    target_type TEXT NOT NULL, -- 'fiche', 'user', 'sheet'
    target_id TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_requests table for modification requests
CREATE TABLE public.user_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    request_type TEXT NOT NULL, -- 'update', 'create', 'delete'
    fiche_id TEXT,
    original_data JSONB,
    requested_changes JSONB NOT NULL,
    admin_response TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    processed_by TEXT, -- admin email
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_actions (only admins can access)
CREATE POLICY "Admin actions are viewable by admins only" 
ON public.admin_actions 
FOR SELECT 
USING (false); -- Will be handled by admin middleware

CREATE POLICY "Admins can insert admin actions" 
ON public.admin_actions 
FOR INSERT 
WITH CHECK (false); -- Will be handled by admin middleware

-- Create policies for user_requests
CREATE POLICY "User requests are viewable by admins only" 
ON public.user_requests 
FOR SELECT 
USING (false); -- Will be handled by admin middleware

CREATE POLICY "User requests can be created by anyone" 
ON public.user_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "User requests can be updated by admins only" 
ON public.user_requests 
FOR UPDATE 
USING (false); -- Will be handled by admin middleware

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_requests
CREATE TRIGGER update_user_requests_updated_at
    BEFORE UPDATE ON public.user_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_admin_actions_admin_email ON public.admin_actions(admin_email);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at);
CREATE INDEX idx_admin_actions_target_type ON public.admin_actions(target_type);

CREATE INDEX idx_user_requests_user_email ON public.user_requests(user_email);
CREATE INDEX idx_user_requests_status ON public.user_requests(status);
CREATE INDEX idx_user_requests_created_at ON public.user_requests(created_at);