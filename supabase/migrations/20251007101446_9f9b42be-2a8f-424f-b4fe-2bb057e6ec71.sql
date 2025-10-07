-- Fix tags RLS policies to allow public access
-- Tags are shared resources in the planning system

DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can update tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON public.tags;

-- Allow public access to tags (they are shared resources)
CREATE POLICY "Anyone can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update tags" 
ON public.tags 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete tags" 
ON public.tags 
FOR DELETE 
USING (true);