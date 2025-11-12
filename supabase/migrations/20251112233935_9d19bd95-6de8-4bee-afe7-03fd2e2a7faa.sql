-- Adicionar valor padrão para order_number
ALTER TABLE public.orders 
ALTER COLUMN order_number SET DEFAULT 0;