-- Обновляем старые URL в таблице cms_gallery
UPDATE cms_gallery 
SET image_url = REPLACE(image_url, 'https://api.epc-poker.ru/', 'https://api.syndicate-poker.ru/')
WHERE image_url LIKE 'https://api.epc-poker.ru/%';

-- Обновляем старые URL в таблице players
UPDATE players 
SET avatar_url = REPLACE(avatar_url, 'https://api.epc-poker.ru/', 'https://api.syndicate-poker.ru/')
WHERE avatar_url LIKE 'https://api.epc-poker.ru/%';

-- Обновляем старые URL в таблице profiles
UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'https://api.epc-poker.ru/', 'https://api.syndicate-poker.ru/')
WHERE avatar_url LIKE 'https://api.epc-poker.ru/%';

-- Обновляем старые URL в таблице cms_seo (og_image)
UPDATE cms_seo 
SET og_image = REPLACE(og_image, 'https://api.epc-poker.ru/', 'https://api.syndicate-poker.ru/')
WHERE og_image LIKE 'https://api.epc-poker.ru/%';