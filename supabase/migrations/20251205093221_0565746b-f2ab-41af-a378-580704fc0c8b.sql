-- Таблица для шаблонов структур блайндов
CREATE TABLE public.blind_structure_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.blind_structure_templates ENABLE ROW LEVEL SECURITY;

-- Политики: все могут просматривать, только админы могут управлять
CREATE POLICY "Templates are viewable by everyone" 
ON public.blind_structure_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage templates" 
ON public.blind_structure_templates 
FOR ALL 
USING (is_admin(auth.uid()));

-- Триггер для обновления updated_at
CREATE TRIGGER update_blind_structure_templates_updated_at
BEFORE UPDATE ON public.blind_structure_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Добавляем стандартные шаблоны
INSERT INTO public.blind_structure_templates (name, description, is_default, levels) VALUES
('Стандартный (20 мин)', 'Классическая структура с 20-минутными уровнями', true, '[
  {"level": 1, "small_blind": 100, "big_blind": 200, "ante": 200, "duration": 1200, "is_break": false},
  {"level": 2, "small_blind": 200, "big_blind": 400, "ante": 400, "duration": 1200, "is_break": false},
  {"level": 3, "small_blind": 300, "big_blind": 600, "ante": 600, "duration": 1200, "is_break": false},
  {"level": 4, "small_blind": 400, "big_blind": 800, "ante": 800, "duration": 1200, "is_break": false},
  {"level": 5, "small_blind": 500, "big_blind": 1000, "ante": 1000, "duration": 900, "is_break": true},
  {"level": 6, "small_blind": 600, "big_blind": 1200, "ante": 1200, "duration": 1200, "is_break": false},
  {"level": 7, "small_blind": 800, "big_blind": 1600, "ante": 1600, "duration": 1200, "is_break": false},
  {"level": 8, "small_blind": 1000, "big_blind": 2000, "ante": 2000, "duration": 1200, "is_break": false},
  {"level": 9, "small_blind": 1500, "big_blind": 3000, "ante": 3000, "duration": 900, "is_break": true},
  {"level": 10, "small_blind": 2000, "big_blind": 4000, "ante": 4000, "duration": 1200, "is_break": false},
  {"level": 11, "small_blind": 3000, "big_blind": 6000, "ante": 6000, "duration": 1200, "is_break": false},
  {"level": 12, "small_blind": 4000, "big_blind": 8000, "ante": 8000, "duration": 1200, "is_break": false}
]'::jsonb),
('Турбо (10 мин)', 'Быстрая структура с 10-минутными уровнями', true, '[
  {"level": 1, "small_blind": 100, "big_blind": 200, "ante": 200, "duration": 600, "is_break": false},
  {"level": 2, "small_blind": 200, "big_blind": 400, "ante": 400, "duration": 600, "is_break": false},
  {"level": 3, "small_blind": 300, "big_blind": 600, "ante": 600, "duration": 600, "is_break": false},
  {"level": 4, "small_blind": 500, "big_blind": 1000, "ante": 1000, "duration": 600, "is_break": false},
  {"level": 5, "small_blind": 700, "big_blind": 1400, "ante": 1400, "duration": 600, "is_break": false},
  {"level": 6, "small_blind": 1000, "big_blind": 2000, "ante": 2000, "duration": 600, "is_break": false},
  {"level": 7, "small_blind": 1500, "big_blind": 3000, "ante": 3000, "duration": 600, "is_break": false},
  {"level": 8, "small_blind": 2000, "big_blind": 4000, "ante": 4000, "duration": 600, "is_break": false}
]'::jsonb),
('Глубокий стек (30 мин)', 'Структура для глубокой игры с 30-минутными уровнями', true, '[
  {"level": 1, "small_blind": 50, "big_blind": 100, "ante": 100, "duration": 1800, "is_break": false},
  {"level": 2, "small_blind": 100, "big_blind": 200, "ante": 200, "duration": 1800, "is_break": false},
  {"level": 3, "small_blind": 150, "big_blind": 300, "ante": 300, "duration": 1800, "is_break": false},
  {"level": 4, "small_blind": 200, "big_blind": 400, "ante": 400, "duration": 1800, "is_break": false},
  {"level": 5, "small_blind": 300, "big_blind": 600, "ante": 600, "duration": 900, "is_break": true},
  {"level": 6, "small_blind": 400, "big_blind": 800, "ante": 800, "duration": 1800, "is_break": false},
  {"level": 7, "small_blind": 500, "big_blind": 1000, "ante": 1000, "duration": 1800, "is_break": false},
  {"level": 8, "small_blind": 600, "big_blind": 1200, "ante": 1200, "duration": 1800, "is_break": false},
  {"level": 9, "small_blind": 800, "big_blind": 1600, "ante": 1600, "duration": 900, "is_break": true},
  {"level": 10, "small_blind": 1000, "big_blind": 2000, "ante": 2000, "duration": 1800, "is_break": false}
]'::jsonb);