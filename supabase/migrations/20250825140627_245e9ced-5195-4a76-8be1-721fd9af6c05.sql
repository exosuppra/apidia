-- Fix infinite recursion in RLS policies by creating a security definer function
-- and updating all admin-related policies

-- 1. First, drop existing problematic policies
DROP POLICY IF EXISTS "Admin users can view admin accounts" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can insert admin accounts" ON public.admin_users;
DROP POLICY IF EXISTS "Admin actions are viewable by admins only" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can insert admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "User requests are viewable by admins only" ON public.user_requests;
DROP POLICY IF EXISTS "User requests can be updated by admins only" ON public.user_requests;

-- 2. Create a security definer function to check if current user is admin
-- This prevents infinite recursion by executing with elevated privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current authenticated user's email exists in admin_users table
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Create new RLS policies using the security definer function

-- Admin users policies
CREATE POLICY "Admin users can view admin accounts" 
ON public.admin_users 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admin users can insert admin accounts" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can update admin accounts" 
ON public.admin_users 
FOR UPDATE 
USING (public.is_admin());

-- Admin actions policies  
CREATE POLICY "Admin actions are viewable by admins only" 
ON public.admin_actions 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can insert admin actions" 
ON public.admin_actions 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update admin actions" 
ON public.admin_actions 
FOR UPDATE 
USING (public.is_admin());

-- User requests policies
CREATE POLICY "User requests are viewable by admins only" 
ON public.user_requests 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "User requests can be updated by admins only" 
ON public.user_requests 
FOR UPDATE 
USING (public.is_admin());

-- Keep the existing policy that allows anyone to create user requests
-- This is already correct: "User requests can be created by anyone"