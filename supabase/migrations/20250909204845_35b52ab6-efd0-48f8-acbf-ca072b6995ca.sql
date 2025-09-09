-- Créer une fonction de vérification simple qui gère les mots de passe en clair temporairement
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text, stored_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Comparaison directe pour le développement (à sécuriser en production)
  RETURN input_password = stored_hash;
END;
$$;

-- Créer une fonction de hachage simple qui retourne le mot de passe en clair (temporaire)
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Retourner le mot de passe en clair temporairement
  RETURN password;
END;
$$;