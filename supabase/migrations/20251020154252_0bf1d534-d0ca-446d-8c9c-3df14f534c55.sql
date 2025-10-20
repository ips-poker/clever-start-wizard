-- Создание RLS политик для загрузки аватаров

-- Политика для загрузки аватаров (доступна всем аутентифицированным и Telegram пользователям)
CREATE POLICY "Allow avatar uploads for all users"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Политика для обновления аватаров
CREATE POLICY "Allow avatar updates for all users"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'gallery' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Политика для удаления аватаров
CREATE POLICY "Allow avatar deletion for all users"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'gallery' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Политика для просмотра аватаров (публичный доступ)
CREATE POLICY "Allow public avatar viewing"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'gallery' 
  AND (storage.foldername(name))[1] = 'avatars'
);