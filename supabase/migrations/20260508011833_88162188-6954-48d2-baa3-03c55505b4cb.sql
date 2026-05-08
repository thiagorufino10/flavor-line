ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at);