-- Fix the admin password hash for the existing user
-- First, let's create a proper bcrypt hash for the password "Mauque04"

-- Update the user's password with a new properly generated hash
UPDATE admin_users 
SET password_hash = crypt('Mauque04', gen_salt('bf', 8)),
    updated_at = now()
WHERE email = 'quentin.duroy28@gmail.com';

-- Verify the update worked by checking the user exists
SELECT email, 
       created_at, 
       updated_at,
       (password_hash IS NOT NULL) as has_password_hash
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';