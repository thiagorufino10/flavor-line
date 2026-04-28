ALTER TABLE public.payment_rates DROP CONSTRAINT IF EXISTS payment_rates_payment_method_key;
ALTER TABLE public.payment_rates DROP CONSTRAINT IF EXISTS payment_rates_client_id_payment_method_key;
ALTER TABLE public.payment_rates ADD CONSTRAINT payment_rates_client_id_payment_method_key UNIQUE (client_id, payment_method);