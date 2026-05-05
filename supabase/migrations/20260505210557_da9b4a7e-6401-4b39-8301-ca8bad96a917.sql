CREATE TABLE IF NOT EXISTS public.food99_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  merchant_id text NOT NULL,
  store_token text,
  environment text NOT NULL DEFAULT 'sandbox',
  active boolean NOT NULL DEFAULT true,
  last_polling_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.food99_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia credenciais 99food do proprio cliente"
  ON public.food99_credentials FOR ALL TO authenticated
  USING (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ver credenciais 99food do proprio cliente"
  ON public.food99_credentials FOR SELECT TO authenticated
  USING (client_id = get_user_client_id());

CREATE TRIGGER update_food99_credentials_updated_at
  BEFORE UPDATE ON public.food99_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();