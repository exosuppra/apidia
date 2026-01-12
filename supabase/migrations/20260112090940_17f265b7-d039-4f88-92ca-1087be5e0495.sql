-- Ajouter une contrainte unique sur fiche_id pour fiches_verified (permet l'upsert)
ALTER TABLE public.fiches_verified ADD CONSTRAINT fiches_verified_fiche_id_unique UNIQUE (fiche_id);