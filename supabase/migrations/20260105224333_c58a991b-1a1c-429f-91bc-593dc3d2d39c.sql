-- Create storage bucket for fiche media
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiche-media', 'fiche-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to fiche media
CREATE POLICY "Public can view fiche media"
ON storage.objects FOR SELECT
USING (bucket_id = 'fiche-media');

-- Allow service role to upload media (edge functions use service role)
CREATE POLICY "Service role can upload fiche media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fiche-media');

-- Allow service role to delete media
CREATE POLICY "Service role can delete fiche media"
ON storage.objects FOR DELETE
USING (bucket_id = 'fiche-media');