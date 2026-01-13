-- Create table for Apidae sync history
CREATE TABLE public.apidae_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'automatic')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  fiches_synced INTEGER DEFAULT 0,
  fiches_created INTEGER DEFAULT 0,
  fiches_updated INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  triggered_by TEXT
);

-- Enable RLS
ALTER TABLE public.apidae_sync_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view sync history"
ON public.apidae_sync_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow insert from edge functions"
ON public.apidae_sync_history
FOR INSERT
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_apidae_sync_history_started_at ON public.apidae_sync_history(started_at DESC);