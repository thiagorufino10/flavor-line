-- Add new values to product_category enum
ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'doces';
ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'coxinha';
ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'cachorro_quente';
