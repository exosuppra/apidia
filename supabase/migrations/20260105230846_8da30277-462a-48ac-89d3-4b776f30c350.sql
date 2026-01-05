-- Ajouter un champ pour gérer la visibilité des fiches (publiée/masquée)
ALTER TABLE public.fiches_data 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- Index pour le filtrage par statut de publication
CREATE INDEX IF NOT EXISTS idx_fiches_data_is_published ON public.fiches_data(is_published);

-- Trigger pour marquer synced_to_sheets = false à chaque modification
CREATE OR REPLACE FUNCTION public.mark_fiche_unsynced()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la modification n'est pas uniquement sur synced_to_sheets, marquer comme non synchronisé
  IF OLD.synced_to_sheets = true AND (
    OLD.data IS DISTINCT FROM NEW.data OR
    OLD.is_published IS DISTINCT FROM NEW.is_published OR
    OLD.fiche_type IS DISTINCT FROM NEW.fiche_type
  ) THEN
    NEW.synced_to_sheets := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_mark_fiche_unsynced ON public.fiches_data;
CREATE TRIGGER trigger_mark_fiche_unsynced
BEFORE UPDATE ON public.fiches_data
FOR EACH ROW
EXECUTE FUNCTION public.mark_fiche_unsynced();