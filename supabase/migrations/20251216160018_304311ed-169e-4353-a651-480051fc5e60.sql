-- Add share token to editorial_plannings
ALTER TABLE public.editorial_plannings
ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Create index for share_token lookups
CREATE INDEX IF NOT EXISTS idx_editorial_plannings_share_token ON public.editorial_plannings(share_token);

-- Create task_comments table for public feedback
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert comments (public feedback)
CREATE POLICY "Anyone can insert comments"
ON public.task_comments
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can view comments
CREATE POLICY "Anyone can view comments"
ON public.task_comments
FOR SELECT
USING (true);

-- Policy: Admins can delete comments
CREATE POLICY "Admins can delete comments"
ON public.task_comments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster task comment lookups
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);