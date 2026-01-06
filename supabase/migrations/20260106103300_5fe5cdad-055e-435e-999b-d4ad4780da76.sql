-- Create fiche_history table for tracking all modifications
CREATE TABLE public.fiche_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_id TEXT NOT NULL,
  fiche_uuid UUID REFERENCES public.fiches_data(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'create', 'update', 'publish', 'unpublish', 'verify', 'manual_edit'
  actor_type TEXT NOT NULL, -- 'user', 'admin', 'system'
  actor_id UUID,
  actor_name TEXT NOT NULL,
  changes JSONB, -- {"fields": [{"field": "...", "label": "...", "old_value": "...", "new_value": "..."}]}
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fiche_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all history
CREATE POLICY "Admins can view fiche history"
ON public.fiche_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert history"
ON public.fiche_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_fiche_history_fiche_id ON public.fiche_history(fiche_id);
CREATE INDEX idx_fiche_history_fiche_uuid ON public.fiche_history(fiche_uuid);
CREATE INDEX idx_fiche_history_created_at ON public.fiche_history(created_at DESC);