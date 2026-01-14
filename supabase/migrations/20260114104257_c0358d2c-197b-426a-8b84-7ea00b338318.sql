-- Add auto_push_to_apidae column to verification_config
ALTER TABLE public.verification_config
ADD COLUMN auto_push_to_apidae boolean NOT NULL DEFAULT false;