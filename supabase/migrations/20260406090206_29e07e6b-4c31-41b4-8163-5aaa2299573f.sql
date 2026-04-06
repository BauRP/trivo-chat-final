-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'application/pdf', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Public read access
CREATE POLICY "Public read access for chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

-- Anyone can upload (no auth required for P2P app)
CREATE POLICY "Anyone can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media');

-- Anyone can delete their uploads
CREATE POLICY "Anyone can delete chat media"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-media');