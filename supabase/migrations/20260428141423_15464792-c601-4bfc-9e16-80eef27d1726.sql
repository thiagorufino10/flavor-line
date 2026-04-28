
-- 1) Criar os 7 molhos padrão como complementos (preço 0) para cada cliente que tem itens de frango/batata
WITH target_clients AS (
  SELECT DISTINCT client_id
  FROM menu_items
  WHERE LOWER(name) LIKE '%frango%' OR LOWER(name) LIKE '%batata%'
),
sauce_names(name) AS (
  VALUES ('Ketchup'), ('Maionese'), ('Barbecue'), ('Malukus'),
         ('Creme de alho'), ('Cheddar'), ('Baconeese')
)
INSERT INTO complements (client_id, name, price, active)
SELECT tc.client_id, s.name, 0, true
FROM target_clients tc
CROSS JOIN sauce_names s
WHERE NOT EXISTS (
  SELECT 1 FROM complements c
  WHERE c.client_id = tc.client_id AND LOWER(c.name) = LOWER(s.name)
);

-- 2) Vincular esses molhos a todos os itens de frango/batata do mesmo cliente
INSERT INTO complement_menu_items (client_id, menu_item_id, complement_id)
SELECT m.client_id, m.id, c.id
FROM menu_items m
JOIN complements c
  ON c.client_id = m.client_id
 AND c.name IN ('Ketchup','Maionese','Barbecue','Malukus','Creme de alho','Cheddar','Baconeese')
WHERE (LOWER(m.name) LIKE '%frango%' OR LOWER(m.name) LIKE '%batata%')
  AND NOT EXISTS (
    SELECT 1 FROM complement_menu_items l
    WHERE l.menu_item_id = m.id AND l.complement_id = c.id
  );
