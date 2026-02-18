
ALTER TABLE public.verification_config
ADD COLUMN IF NOT EXISTS exclude_recently_imported boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS days_consider_recent_import integer NOT NULL DEFAULT 7;
