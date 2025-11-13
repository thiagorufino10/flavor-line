-- Adicionar coluna observations na tabela order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS observations text;