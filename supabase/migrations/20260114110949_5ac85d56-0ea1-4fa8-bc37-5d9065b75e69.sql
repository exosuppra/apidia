-- Add live progress fields to apidae_sync_config for real-time tracking
ALTER TABLE public.apidae_sync_config
  ADD COLUMN IF NOT EXISTS current_sync_status text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS current_sync_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_sync_synced integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_sync_batch integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_sync_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_sync_completed_at timestamptz;