-- Create verification_alerts table
CREATE TABLE public.verification_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id TEXT NOT NULL,
  fiche_type TEXT,
  fiche_name TEXT,
  field_name TEXT NOT NULL,
  current_value TEXT,
  found_value TEXT,
  source_url TEXT NOT NULL,
  source_name TEXT,
  confidence_score NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.verification_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for admins
CREATE POLICY "Admins can manage verification alerts"
ON public.verification_alerts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add verification columns to fiches_data
ALTER TABLE public.fiches_data 
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_verified';

-- Create index for faster queries
CREATE INDEX idx_verification_alerts_status ON public.verification_alerts(status);
CREATE INDEX idx_verification_alerts_fiche_id ON public.verification_alerts(fiche_id);
CREATE INDEX idx_fiches_data_verification ON public.fiches_data(verification_status, last_verified_at);