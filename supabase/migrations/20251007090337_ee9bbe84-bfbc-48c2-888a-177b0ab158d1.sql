-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "Authenticated users can view task attachments"
ON public.task_attachments
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload task attachments"
ON public.task_attachments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete task attachments"
ON public.task_attachments
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Storage policies for task-attachments bucket
CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete task attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);