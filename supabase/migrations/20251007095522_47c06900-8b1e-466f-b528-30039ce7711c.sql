-- ============================================
-- CRITICAL SECURITY FIX MIGRATION
-- Addresses: RLS disabled, plaintext passwords, public data exposure
-- ============================================

-- 1. Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Fix existing functions to have immutable search_path
DROP FUNCTION IF EXISTS public.verify_admin_password(text, text);
DROP FUNCTION IF EXISTS public.hash_password(text);

-- 5. CRITICAL: Delete all plaintext passwords from admin_users
DELETE FROM public.admin_users;

-- 6. RE-ENABLE RLS on planning tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- 7. Update admin_users RLS policy to actually restrict access
DROP POLICY IF EXISTS "Allow service role access" ON public.admin_users;

CREATE POLICY "Only service role can access admin_users"
ON public.admin_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8. Make task-attachments storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'task-attachments';

-- 9. Add storage policies for secure file access
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete their attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid() IS NOT NULL
);

-- 10. Update update_updated_at_column function with fixed search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 11. Update handle_updated_at function with fixed search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;