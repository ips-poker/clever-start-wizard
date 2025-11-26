-- Обновляем все URL изображений в галерее на проксированные
UPDATE cms_gallery 
SET image_url = REPLACE(image_url, 'https://mokhssmnorrhohrowxvu.supabase.co', 'https://api.epc-poker.ru')
WHERE image_url LIKE 'https://mokhssmnorrhohrowxvu.supabase.co%';

-- Обновляем URL в cms_content если там есть ссылки на изображения
UPDATE cms_content
SET content_value = REPLACE(content_value, 'https://mokhssmnorrhohrowxvu.supabase.co', 'https://api.epc-poker.ru')
WHERE content_value LIKE '%https://mokhssmnorrhohrowxvu.supabase.co%';

-- Обновляем URL в cms_seo (og_image)
UPDATE cms_seo
SET og_image = REPLACE(og_image, 'https://mokhssmnorrhohrowxvu.supabase.co', 'https://api.epc-poker.ru')
WHERE og_image LIKE 'https://mokhssmnorrhohrowxvu.supabase.co%';

-- Обновляем аватары игроков
UPDATE players
SET avatar_url = REPLACE(avatar_url, 'https://mokhssmnorrhohrowxvu.supabase.co', 'https://api.epc-poker.ru')
WHERE avatar_url LIKE 'https://mokhssmnorrhohrowxvu.supabase.co%';

-- Обновляем аватары в профилях
UPDATE profiles
SET avatar_url = REPLACE(avatar_url, 'https://mokhssmnorrhohrowxvu.supabase.co', 'https://api.epc-poker.ru')
WHERE avatar_url LIKE 'https://mokhssmnorrhohrowxvu.supabase.co%';