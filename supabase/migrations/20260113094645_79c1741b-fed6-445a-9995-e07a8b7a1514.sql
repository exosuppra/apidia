-- Create storage bucket for mission justificatifs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mission-justificatifs', 
  'mission-justificatifs', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload justificatifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mission-justificatifs');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read justificatifs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mission-justificatifs');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete justificatifs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mission-justificatifs');