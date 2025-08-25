-- Let's check what crypto functions are available
\df pg_catalog.digest

-- Create a simple hash verification function using available functions
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  -- For now, let's use a simple SHA256 based verification
  -- This is a temporary solution until we can get bcrypt working
  
  -- Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
  IF stored_hash ~ '^\$2[abxy]?\$' THEN
    -- For bcrypt hashes, we'll need to update to a simpler format
    -- For now, return false and log
    RAISE LOG 'Bcrypt hash detected, needs manual password reset';
    RETURN false;
  END IF;
  
  -- Handle simple SHA256 hashes
  RETURN stored_hash = encode(digest(input_password || 'salt', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;