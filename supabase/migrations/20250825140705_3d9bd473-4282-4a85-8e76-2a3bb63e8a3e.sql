-- Fix security warnings: Set search_path for all functions to prevent injection attacks

-- Update the newly created is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current authenticated user's email exists in admin_users table
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Update existing functions to set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_openai_image(prompt text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- This will be implemented via edge function
  RETURN json_build_object('status', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;