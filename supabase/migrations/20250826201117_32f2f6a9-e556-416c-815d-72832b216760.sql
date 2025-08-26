-- Ajouter une contrainte unique sur user_id pour permettre l'upsert
ALTER TABLE user_google_tokens 
ADD CONSTRAINT user_google_tokens_user_id_unique UNIQUE (user_id);