-- Use MD5 for password verification (simpler approach)
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  -- Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
  IF stored_hash ~ '^\$2[abxy]?\$' THEN
    -- For bcrypt hashes, we'll need to update to a simpler format
    RAISE LOG 'Bcrypt hash detected, needs manual password reset';
    RETURN false;
  END IF;
  
  -- Handle simple MD5 hashes with salt
  RETURN stored_hash = md5(input_password || 'salt');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Update the admin password to use MD5
UPDATE admin_users 
SET password_hash = md5('Mauque04' || 'salt')
WHERE email = 'quentin.duroy28@gmail.com';

-- Test the function
SELECT 
  verify_admin_password('Mauque04', password_hash) as should_be_true, 
  email,
  password_hash as new_hash
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';