-- Reset admin password to work with our SHA256 function
-- Password: Mauque04, using SHA256 with salt
UPDATE admin_users 
SET password_hash = encode(digest('Mauque04' || 'salt', 'sha256'), 'hex')
WHERE email = 'quentin.duroy28@gmail.com';

-- Verify the update worked
SELECT email, password_hash, length(password_hash) as new_hash_length 
FROM admin_users 
WHERE email = 'quentin.duroy28@gmail.com';