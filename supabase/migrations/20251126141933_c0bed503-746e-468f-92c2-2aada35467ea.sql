-- Add must_change_password flag to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Create function to automatically set must_change_password for new users
CREATE OR REPLACE FUNCTION public.set_must_change_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.must_change_password := true;
  RETURN NEW;
END;
$$;

-- Create trigger to set must_change_password on new profile creation
DROP TRIGGER IF EXISTS on_profile_created_set_password_flag ON public.profiles;
CREATE TRIGGER on_profile_created_set_password_flag
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_must_change_password();