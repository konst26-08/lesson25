INSERT INTO sports (code, name)
VALUES
  ('running', 'Бег'),
  ('gym', 'Зал'),
  ('fitness', 'Фитнес'),
  ('casual', 'Повседневная')
ON CONFLICT (code) DO NOTHING;

INSERT INTO brands (code, name)
VALUES
  ('stepup', 'StepUp'),
  ('boldsport', 'Bold Sport')
ON CONFLICT (code) DO NOTHING;

INSERT INTO materials (code, name)
VALUES
  ('mesh', 'Сетка'),
  ('knit', 'Трикотаж'),
  ('leather', 'Кожа'),
  ('synthetic', 'Синтетика')
ON CONFLICT (code) DO NOTHING;

INSERT INTO technologies (code, name, description)
VALUES
  ('air-cushion', 'Air Cushion', 'Амортизация для снижения ударной нагрузки'),
  ('arch-support', 'Arch Support', 'Поддержка свода стопы'),
  ('anti-slip', 'Anti Slip', 'Улучшенное сцепление с поверхностью')
ON CONFLICT (code) DO NOTHING;
