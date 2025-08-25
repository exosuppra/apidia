-- Let's test crypt function directly first
SELECT crypt('Mauque04', gen_salt('bf', 8)) as new_hash;

-- Let's also test the existing hash manually
SELECT 
  email,
  password_hash,
  crypt('Mauque04', password_hash) as computed_hash,
  (crypt('Mauque04', password_hash) = password_hash) as matches
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';

-- Now create a fresh hash and update the user
DO $$
DECLARE
  fresh_hash text;
BEGIN
  -- Generate a fresh hash
  SELECT crypt('Mauque04', gen_salt('bf', 6)) INTO fresh_hash;
  
  -- Update the user with the fresh hash
  UPDATE admin_users 
  SET password_hash = fresh_hash,
      updated_at = now()
  WHERE email = 'quentin.duroy28@gmail.com';
  
  -- Log the operation
  RAISE NOTICE 'Updated password hash for quentin.duroy28@gmail.com';
END $$;

-- Verify the update worked
SELECT 
  email,
  verify_admin_password('Mauque04', password_hash) as verification_works,
  crypt('Mauque04', password_hash) = password_hash as direct_test
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';