-- Add image_url column to pets table
ALTER TABLE pets ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Enable storage for pets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pets', 'pets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to the pets bucket
CREATE POLICY "Allow authenticated users to upload pet images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own pet images
CREATE POLICY "Allow users to update their own pet images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own pet images
CREATE POLICY "Allow users to delete their own pet images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to pet images
CREATE POLICY "Allow public access to pet images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pets'); 