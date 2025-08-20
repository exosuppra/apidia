-- Create admin_users table for administrator accounts
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users (only admins can manage other admins)
CREATE POLICY "Admin users can view admin accounts" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() IN (SELECT auth.uid() FROM public.admin_users WHERE email = auth.email()));

CREATE POLICY "Admin users can insert admin accounts" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth.uid() FROM public.admin_users WHERE email = auth.email()));

-- Insert the default admin account (password will be hashed on the backend)
INSERT INTO public.admin_users (email, password_hash) 
VALUES ('quentin.duroy28@gmail.com', crypt('Mauque04', gen_salt('bf')));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();