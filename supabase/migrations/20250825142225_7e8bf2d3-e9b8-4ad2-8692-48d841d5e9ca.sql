-- Fix the password verification function
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  -- Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
  IF stored_hash ~ '^\$2[abxy]?\$' THEN
    -- For bcrypt hashes, we'll need to update to a simpler format
    RAISE LOG 'Bcrypt hash detected, needs manual password reset';
    RETURN false;
  END IF;
  
  -- Handle simple SHA256 hashes - compare the computed hash with stored hash
  RETURN stored_hash = encode(digest(input_password || 'salt', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Test the function
SELECT verify_admin_password('Mauque04', password_hash) as should_be_true, email 
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';