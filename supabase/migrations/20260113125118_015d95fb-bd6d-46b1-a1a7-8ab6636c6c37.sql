-- Create Apidae sync configuration table
CREATE TABLE public.apidae_sync_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT false,
  schedule_type TEXT DEFAULT 'daily' CHECK (schedule_type IN ('hourly', 'daily', 'weekly')),
  sync_hour INTEGER DEFAULT 6 CHECK (sync_hour >= 0 AND sync_hour <= 23),
  selection_ids INTEGER[] DEFAULT '{}',
  fiches_per_sync INTEGER DEFAULT 200,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_sync_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apidae_sync_config ENABLE ROW LEVEL SECURITY;

-- Allow admins to read/write config
CREATE POLICY "Admins can manage apidae sync config"
ON public.apidae_sync_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.apidae_sync_config (is_enabled, schedule_type, sync_hour, fiches_per_sync)
VALUES (false, 'daily', 6, 200);

-- Add trigger for updated_at
CREATE TRIGGER update_apidae_sync_config_updated_at
BEFORE UPDATE ON public.apidae_sync_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();