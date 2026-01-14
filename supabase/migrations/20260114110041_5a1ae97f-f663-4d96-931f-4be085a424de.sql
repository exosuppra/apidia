-- Add live progress fields to help UI show current fiche + detect stalls
ALTER TABLE public.verification_config
  ADD COLUMN IF NOT EXISTS current_run_current_fiche_id text,
  ADD COLUMN IF NOT EXISTS current_run_current_index integer,
  ADD COLUMN IF NOT EXISTS current_run_last_heartbeat_at timestamptz;