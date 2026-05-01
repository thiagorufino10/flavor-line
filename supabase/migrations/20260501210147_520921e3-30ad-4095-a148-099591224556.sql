ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ifood_payload jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ifood_order_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ifood_order_timing text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ifood_pickup_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ifood_scheduled_for timestamptz;