-- Activer l'extension pgcrypto pour le hachage des mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Corriger la fonction de hachage de mot de passe
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Utiliser crypt avec blowfish si disponible, sinon fallback sur md5
  BEGIN
    RETURN crypt(password, gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    -- Fallback sur md5 si blowfish n'est pas disponible
    RETURN crypt(password, gen_salt('md5'));
  END;
END;
$$;

-- Corriger la fonction de vérification de mot de passe
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si le hash stocké est en clair (pour admin123), le comparer directement temporairement
  IF stored_hash = 'admin123' THEN
    RETURN input_password = 'admin123';
  END IF;
  
  -- Sinon utiliser la vérification cryptographique normale
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$;

-- Mettre à jour le mot de passe admin avec un hash correct
-- D'abord, récupérer et hasher le mot de passe admin123 
UPDATE public.admin_users 
SET password_hash = public.hash_password('admin123')
WHERE email = 'q.duroy@paysdemanosque.com' AND password_hash = 'admin123';