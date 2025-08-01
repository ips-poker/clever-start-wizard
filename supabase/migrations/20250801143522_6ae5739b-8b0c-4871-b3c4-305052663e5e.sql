-- Создать bucket для изображений галереи
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gallery', 'gallery', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Создать политики для gallery bucket
CREATE POLICY "Gallery images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery');

CREATE POLICY "Only admins can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gallery' AND is_admin(auth.uid()));

CREATE POLICY "Only admins can update gallery images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'gallery' AND is_admin(auth.uid()));

CREATE POLICY "Only admins can delete gallery images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gallery' AND is_admin(auth.uid()));