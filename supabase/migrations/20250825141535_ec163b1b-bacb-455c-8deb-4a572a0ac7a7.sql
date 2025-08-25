-- Recreate the verify_admin_password function with a simpler approach
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  -- Direct bcrypt verification using PostgreSQL's crypt function
  RETURN crypt(input_password, stored_hash) = stored_hash;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE LOG 'Error in verify_admin_password: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Test the function immediately
SELECT verify_admin_password('Mauque04', password_hash) as test_result, email
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';