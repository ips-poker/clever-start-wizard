-- Добавить тестовые данные в галерею
INSERT INTO public.cms_gallery (title, image_url, description, category, is_featured, is_active, alt_text) VALUES
('Главный покерный зал', '/src/assets/gallery/main-poker-room.jpg', 'Просторный зал с профессиональными столами', 'tournament', true, true, 'Главный покерный зал IPS'),
('Турнирный стол', '/src/assets/gallery/tournament-table.jpg', 'Профессиональный турнирный стол', 'tournament', false, true, 'Турнирный стол'),
('VIP зона', '/src/assets/gallery/vip-zone.jpg', 'Эксклюзивная VIP зона для привилегированных игроков', 'vip', true, true, 'VIP зона'),
('Зона отдыха', '/src/assets/gallery/lounge-area.jpg', 'Комфортная зона отдыха', 'lounge', false, true, 'Зона отдыха'),
('Церемония награждения', '/src/assets/gallery/awards-ceremony.jpg', 'Торжественная церемония награждения победителей', 'events', false, true, 'Церемония награждения');

-- Добавить тестовые отзывы
INSERT INTO public.cms_content (page_slug, content_key, content_value, content_type, is_active, meta_data) VALUES
('testimonials', 'testimonial_1_name', 'Алексей Петров', 'text', true, '{"rating": 5, "position": 1}'),
('testimonials', 'testimonial_1_text', 'Отличный клуб! Профессиональная атмосфера и высокий уровень игры. Рейтинговая система ELO добавляет азарта.', 'text', true, '{"rating": 5, "position": 1}'),
('testimonials', 'testimonial_1_image', '/src/assets/gallery/poker-chips.jpg', 'image', true, '{"rating": 5, "position": 1}'),

('testimonials', 'testimonial_2_name', 'Мария Иванова', 'text', true, '{"rating": 5, "position": 2}'),
('testimonials', 'testimonial_2_text', 'Превосходный сервис и организация турниров. Здесь можно действительно развивать свои навыки.', 'text', true, '{"rating": 5, "position": 2}'),
('testimonials', 'testimonial_2_image', '/src/assets/gallery/registration.jpg', 'image', true, '{"rating": 5, "position": 2}'),

('testimonials', 'testimonial_3_name', 'Дмитрий Козлов', 'text', true, '{"rating": 5, "position": 3}'),
('testimonials', 'testimonial_3_text', 'IPS - это не просто покерный клуб, это место где встречаются настоящие профессионалы.', 'text', true, '{"rating": 5, "position": 3}'),
('testimonials', 'testimonial_3_image', '/src/assets/gallery/masterclass.jpg', 'image', true, '{"rating": 5, "position": 3}');

-- Добавить контент для блога
INSERT INTO public.cms_content (page_slug, content_key, content_value, content_type, is_active) VALUES
('blog', 'post_1_title', 'Стратегии турнирного покера', 'text', true),
('blog', 'post_1_content', 'Изучаем основные стратегии игры в турнирах. Важность позиции, размеров ставок и чтения оппонентов.', 'text', true),
('blog', 'post_1_image', '/src/assets/gallery/team-tournament.jpg', 'image', true),

('blog', 'post_2_title', 'ELO рейтинг в покере', 'text', true),
('blog', 'post_2_content', 'Как работает рейтинговая система ELO в нашем клубе и почему она делает игру честнее.', 'text', true),
('blog', 'post_2_image', '/src/assets/gallery/poker-chips.jpg', 'image', true);