-- Тестовые товары по одному на каждый вид спорта (для сценария покупки).

INSERT INTO products (slug, name, sport_id, brand_id, base_price, is_active)
SELECT
  'racer-pro',
  'Racer Pro',
  s.id,
  b.id,
  10990.00,
  TRUE
FROM sports s
CROSS JOIN brands b
WHERE s.code = 'running' AND b.code = 'stepup'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, sport_id, brand_id, base_price, is_active)
SELECT
  'gym-flex',
  'Gym Flex',
  s.id,
  b.id,
  8990.00,
  TRUE
FROM sports s
CROSS JOIN brands b
WHERE s.code = 'gym' AND b.code = 'boldsport'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, sport_id, brand_id, base_price, is_active)
SELECT
  'fit-core-pro',
  'Fit Core Pro',
  s.id,
  b.id,
  9490.00,
  TRUE
FROM sports s
CROSS JOIN brands b
WHERE s.code = 'fitness' AND b.code = 'stepup'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, sport_id, brand_id, base_price, is_active)
SELECT
  'city-walk-lite',
  'City Walk Lite',
  s.id,
  b.id,
  7990.00,
  TRUE
FROM sports s
CROSS JOIN brands b
WHERE s.code = 'casual' AND b.code = 'stepup'
ON CONFLICT (slug) DO NOTHING;
