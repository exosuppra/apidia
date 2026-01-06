-- Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table de configuration pour l'automatisation des vérifications
CREATE TABLE public.verification_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_type TEXT NOT NULL DEFAULT 'monthly' CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  fiches_per_run INTEGER NOT NULL DEFAULT 30,
  days_between_verification INTEGER NOT NULL DEFAULT 30,
  exclude_recently_modified BOOLEAN NOT NULL DEFAULT true,
  days_consider_recent INTEGER NOT NULL DEFAULT 7,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY "Admins can manage verification config"
ON public.verification_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default configuration
INSERT INTO public.verification_config (is_enabled, schedule_type, fiches_per_run, days_between_verification, exclude_recently_modified, days_consider_recent)
VALUES (false, 'monthly', 30, 30, true, 7);

-- Trigger for updated_at
CREATE TRIGGER update_verification_config_updated_at
BEFORE UPDATE ON public.verification_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();