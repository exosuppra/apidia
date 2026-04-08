
-- Table des communes
CREATE TABLE public.linking_communes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.linking_communes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage linking_communes"
  ON public.linking_communes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table des sites
CREATE TABLE public.linking_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commune_id UUID NOT NULL REFERENCES public.linking_communes(id) ON DELETE CASCADE,
  type_contenu TEXT,
  url TEXT NOT NULL,
  date_mise_a_jour TEXT,
  date_dernier_controle DATE,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  modifications TEXT,
  date_contact DATE,
  reponse TEXT,
  contact_email TEXT,
  contact_notes TEXT,
  last_scrape_result JSONB,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.linking_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage linking_sites"
  ON public.linking_sites FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_linking_sites_updated_at
  BEFORE UPDATE ON public.linking_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
