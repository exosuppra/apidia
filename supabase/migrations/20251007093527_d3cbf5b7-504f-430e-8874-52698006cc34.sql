-- Disable RLS on planning tables temporarily for admin interface
-- Since the admin authentication doesn't use Supabase Auth
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments DISABLE ROW LEVEL SECURITY;