-- Enable the pgcrypto extension to use crypt function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a simple, reliable function now that pgcrypto is available
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
  SELECT crypt(input_password, stored_hash) = stored_hash;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Test the new function
SELECT 
  email,
  verify_admin_password('Mauque04', password_hash) as function_test,
  'Function should now work' as status
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';