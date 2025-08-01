-- Создаем RLS политики для storage bucket gallery
-- Разрешаем всем просматривать изображения
CREATE POLICY "Gallery images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery');

-- Разрешаем аутентифицированным пользователям загружать изображения
CREATE POLICY "Authenticated users can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- Разрешаем аутентифицированным пользователям обновлять свои изображения
CREATE POLICY "Authenticated users can update gallery images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- Разрешаем администраторам удалять изображения
CREATE POLICY "Admins can delete gallery images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gallery' AND is_admin(auth.uid()));