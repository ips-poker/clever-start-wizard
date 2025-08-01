-- Добавляем контент для страницы "О нас"
INSERT INTO public.cms_content (page_slug, content_key, content_value, content_type, is_active) VALUES
-- Hero Section
('about', 'hero_badge', 'О компании', 'text', true),
('about', 'hero_title', 'International Poker Style', 'text', true),
('about', 'hero_description', 'Мы создали уникальное пространство для любителей покера, где каждый может развивать свои навыки, участвовать в честных турнирах и расти в профессиональной рейтинговой системе.', 'text', true),
('about', 'hero_image', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop', 'text', true),

-- Achievements
('about', 'achievement_1_title', '500+ турниров', 'text', true),
('about', 'achievement_1_desc', 'Проведено за 3 года работы', 'text', true),
('about', 'achievement_1_icon', 'Trophy', 'text', true),
('about', 'achievement_2_title', '1000+ игроков', 'text', true),
('about', 'achievement_2_desc', 'Доверяют нашей системе', 'text', true),
('about', 'achievement_2_icon', 'Users', 'text', true),
('about', 'achievement_3_title', '4.9/5', 'text', true),
('about', 'achievement_3_desc', 'Средняя оценка игроков', 'text', true),
('about', 'achievement_3_icon', 'Star', 'text', true),
('about', 'achievement_4_title', '100%', 'text', true),
('about', 'achievement_4_desc', 'Безопасность данных', 'text', true),
('about', 'achievement_4_icon', 'Shield', 'text', true),

-- Story Section
('about', 'story_badge', 'Наша история', 'text', true),
('about', 'story_title', 'Как всё начиналось', 'text', true),
('about', 'story_paragraph1', 'В 2021 году группа энтузиастов покера решила создать нечто большее, чем просто игровой клуб. Мы хотели построить настоящее сообщество, где каждый игрок мог бы отслеживать свой прогресс и развиваться в профессиональной среде.', 'text', true),
('about', 'story_paragraph2', 'Основой нашего подхода стала справедливая рейтинговая система ELO, адаптированная специально для покера. Это позволило создать объективную оценку навыков каждого игрока и мотивировать к постоянному развитию.', 'text', true),
('about', 'story_paragraph3', 'Сегодня IPS - это не просто покерный клуб, а целая экосистема для развития покерных навыков, включающая регулярные турниры, обучающие программы и дружелюбное сообщество игроков всех уровней.', 'text', true),
('about', 'story_image', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop', 'text', true),

-- Values Section
('about', 'values_badge', 'Наши ценности', 'text', true),
('about', 'values_title', 'Во что мы верим', 'text', true),
('about', 'values_description', 'Наши принципы определяют каждое решение и создают уникальную атмосферу в IPS', 'text', true),
('about', 'value_1_title', 'Честность', 'text', true),
('about', 'value_1_desc', 'Прозрачная рейтинговая система и честная игра - основа нашей философии.', 'text', true),
('about', 'value_1_icon', 'Target', 'text', true),
('about', 'value_2_title', 'Сообщество', 'text', true),
('about', 'value_2_desc', 'Мы создаем дружелюбную атмосферу, где каждый игрок чувствует себя как дома.', 'text', true),
('about', 'value_2_icon', 'Heart', 'text', true),
('about', 'value_3_title', 'Инновации', 'text', true),
('about', 'value_3_desc', 'Постоянно развиваем технологии для улучшения игрового опыта.', 'text', true),
('about', 'value_3_icon', 'Zap', 'text', true),
('about', 'value_4_title', 'Международный уровень', 'text', true),
('about', 'value_4_desc', 'Соответствуем мировым стандартам проведения покерных турниров.', 'text', true),
('about', 'value_4_icon', 'Globe', 'text', true),

-- Team Section
('about', 'team_badge', 'Команда', 'text', true),
('about', 'team_title', 'Познакомьтесь с нашей командой', 'text', true),
('about', 'team_description', 'Профессионалы своего дела, объединенные страстью к покеру и стремлением к совершенству', 'text', true),

-- Team Member 1
('about', 'team_1_name', 'Александр Петров', 'text', true),
('about', 'team_1_role', 'Основатель и Турнирный Директор', 'text', true),
('about', 'team_1_experience', '15+ лет в покере', 'text', true),
('about', 'team_1_image', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face', 'text', true),
('about', 'team_1_achievements', 'WSOP Circuit Ring, EPT Final Table, Международный судья', 'text', true),

-- Team Member 2
('about', 'team_2_name', 'Елена Соколова', 'text', true),
('about', 'team_2_role', 'Технический Директор', 'text', true),
('about', 'team_2_experience', '10+ лет в IT', 'text', true),
('about', 'team_2_image', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face', 'text', true),
('about', 'team_2_achievements', 'Разработка ELO системы, IT сертификации, Автоматизация турниров', 'text', true),

-- Team Member 3
('about', 'team_3_name', 'Дмитрий Волков', 'text', true),
('about', 'team_3_role', 'Главный дилер', 'text', true),
('about', 'team_3_experience', '12+ лет опыта', 'text', true),
('about', 'team_3_image', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face', 'text', true),
('about', 'team_3_achievements', 'Сертификат FIDPA, Обучение новых дилеров, 3000+ турниров', 'text', true);