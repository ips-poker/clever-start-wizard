
-- Сначала удалим существующее ограничение уникальности если оно есть
DROP INDEX IF EXISTS cms_content_page_slug_key;

-- Создадим правильное ограничение уникальности для комбинации page_slug + content_key
ALTER TABLE cms_content 
ADD CONSTRAINT cms_content_page_content_unique 
UNIQUE (page_slug, content_key);
