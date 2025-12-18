-- Table pour stocker les notes Google Maps des établissements
CREATE TABLE public.ereputation_google_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_name TEXT NOT NULL UNIQUE,
  google_maps_url TEXT,
  current_rating NUMERIC(2,1),
  total_reviews INTEGER,
  last_updated_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ereputation_google_ratings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage google ratings"
ON public.ereputation_google_ratings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));