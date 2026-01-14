-- Add progress tracking fields to verification_config
ALTER TABLE public.verification_config
ADD COLUMN IF NOT EXISTS current_run_id uuid,
ADD COLUMN IF NOT EXISTS current_run_status text DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS current_run_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_run_verified integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_run_errors integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_run_started_at timestamptz,
ADD COLUMN IF NOT EXISTS current_run_completed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.verification_config.current_run_status IS 'Status: idle, running, completed, error';