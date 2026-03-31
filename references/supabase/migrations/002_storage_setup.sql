-- Create photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the photos bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Allow users to view photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'photos');

CREATE POLICY "Allow users to view public photos" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'photos');
