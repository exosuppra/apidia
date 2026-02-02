-- Add validation columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_comment text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_requested_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_responded_at timestamp with time zone DEFAULT NULL;

-- Add check constraint for validation_status values
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_validation_status_check 
CHECK (validation_status IS NULL OR validation_status IN ('pending', 'validated', 'rejected'));