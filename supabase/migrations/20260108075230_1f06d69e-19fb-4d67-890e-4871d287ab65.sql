-- Ajouter une contrainte unique sur fiche_id pour fiches_data
ALTER TABLE public.fiches_data ADD CONSTRAINT fiches_data_fiche_id_unique UNIQUE (fiche_id);