-- Fix security issues: Add search_path to functions and create proper RLS policy

-- Update verify_admin_password function with secure search_path
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$;

-- Update hash_password function with secure search_path
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Update update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create RLS policy to allow service role access to admin_users table
-- This allows the admin-login edge function to access the table
CREATE POLICY "Allow service role access" ON public.admin_users
FOR ALL USING (true);