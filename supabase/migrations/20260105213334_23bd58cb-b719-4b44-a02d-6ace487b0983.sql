-- Create table for storing fiches data from Make webhooks
CREATE TABLE public.fiches_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_type TEXT NOT NULL,
  fiche_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'make_webhook',
  synced_to_sheets BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fiche_type, fiche_id)
);

-- Enable RLS
ALTER TABLE public.fiches_data ENABLE ROW LEVEL SECURITY;

-- Admins can manage all fiches
CREATE POLICY "Admins can manage all fiches"
ON public.fiches_data
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow public insert for webhook (no auth required)
CREATE POLICY "Allow public insert for webhooks"
ON public.fiches_data
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_fiches_data_updated_at
BEFORE UPDATE ON public.fiches_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for sync status
CREATE INDEX idx_fiches_data_sync_status ON public.fiches_data(synced_to_sheets) WHERE synced_to_sheets = false;

-- Create index for fiche_type
CREATE INDEX idx_fiches_data_type ON public.fiches_data(fiche_type);