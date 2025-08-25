-- Update the verify_admin_password function to handle both bcrypt and simple hashes
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  -- Handle simple hash format (fallback for development)
  IF stored_hash LIKE 'simple:%' THEN
    DECLARE
      simple_hash text;
      expected_hash text;
    BEGIN
      simple_hash := substring(stored_hash from 8); -- Remove 'simple:' prefix
      -- Create hash using the same method as the create-admin function
      expected_hash := encode(digest(input_password || stored_hash, 'sha256'), 'hex');
      RETURN simple_hash = expected_hash;
    END;
  END IF;
  
  -- Handle bcrypt hash (preferred method)
  BEGIN
    RETURN stored_hash = crypt(input_password, stored_hash);
  EXCEPTION
    WHEN OTHERS THEN
      -- If crypt function fails, return false
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;