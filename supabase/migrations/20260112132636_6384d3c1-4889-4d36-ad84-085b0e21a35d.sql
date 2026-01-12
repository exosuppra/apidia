-- Add last_data_update_at column to track manual edits and imports
ALTER TABLE public.fiches_data 
ADD COLUMN IF NOT EXISTS last_data_update_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have last_data_update_at set to updated_at
UPDATE public.fiches_data 
SET last_data_update_at = updated_at 
WHERE last_data_update_at IS NULL;