-- Créer la table pour les fiches vérifiées
CREATE TABLE public.fiches_verified (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_id text NOT NULL,
  fiche_type text NOT NULL,
  source text NOT NULL DEFAULT 'make_webhook'::text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT true,
  synced_to_sheets boolean NOT NULL DEFAULT false,
  verification_status text DEFAULT 'verified'::text,
  verified_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_by uuid REFERENCES auth.users(id),
  hidden_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(fiche_id)
);

-- Ajouter un index pour les recherches
CREATE INDEX idx_fiches_verified_fiche_id ON public.fiches_verified(fiche_id);
CREATE INDEX idx_fiches_verified_fiche_type ON public.fiches_verified(fiche_type);

-- Activer RLS
ALTER TABLE public.fiches_verified ENABLE ROW LEVEL SECURITY;

-- Policies pour les admins
CREATE POLICY "Admins can manage all verified fiches"
ON public.fiches_verified
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Permettre l'insertion publique pour les edge functions
CREATE POLICY "Allow public insert for migrations"
ON public.fiches_verified
FOR INSERT
WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_fiches_verified_updated_at
BEFORE UPDATE ON public.fiches_verified
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();