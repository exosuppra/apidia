-- Créer une fonction de hachage simple sans pgcrypto
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Utiliser un hachage SHA256 simple avec salt
  RETURN encode(digest(password || 'salt_admin_2024', 'sha256'), 'hex');
END;
$$;

-- Créer une fonction de vérification compatible
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si le hash stocké est en clair (admin123), le comparer directement
  IF stored_hash = 'admin123' THEN
    RETURN input_password = 'admin123';
  END IF;
  
  -- Sinon comparer avec le hash SHA256
  RETURN stored_hash = encode(digest(input_password || 'salt_admin_2024', 'sha256'), 'hex');
END;
$$;

-- Mettre à jour le mot de passe admin avec le nouveau hash
UPDATE public.admin_users 
SET password_hash = public.hash_password('admin123')
WHERE email = 'q.duroy@paysdemanosque.com';