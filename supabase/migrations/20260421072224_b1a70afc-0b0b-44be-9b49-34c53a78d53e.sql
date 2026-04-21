CREATE TABLE public.apidae_criteres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  critere_id bigint NOT NULL UNIQUE,
  libelle_fr text,
  type text,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apidae_criteres_critere_id ON public.apidae_criteres(critere_id);

ALTER TABLE public.apidae_criteres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage apidae_criteres"
  ON public.apidae_criteres FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authenticated can view apidae_criteres"
  ON public.apidae_criteres FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert criteres"
  ON public.apidae_criteres FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update criteres"
  ON public.apidae_criteres FOR UPDATE
  USING (true);

CREATE TRIGGER update_apidae_criteres_updated_at
  BEFORE UPDATE ON public.apidae_criteres
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();