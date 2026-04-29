-- 1. Flag para habilitar iFood por cliente
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ifood_enabled boolean NOT NULL DEFAULT false;

-- Habilita apenas para o cliente "teste"
UPDATE public.clients
  SET ifood_enabled = true
  WHERE lower(name) = 'teste';

-- 2. Credenciais iFood por cliente (Merchant ID + ambiente)
CREATE TABLE IF NOT EXISTS public.ifood_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL UNIQUE,
  merchant_id text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  active boolean NOT NULL DEFAULT true,
  last_polling_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ifood_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia credenciais ifood do proprio cliente"
  ON public.ifood_credentials
  FOR ALL
  TO authenticated
  USING (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ver credenciais ifood do proprio cliente"
  ON public.ifood_credentials
  FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id());

CREATE TRIGGER trg_ifood_credentials_updated
  BEFORE UPDATE ON public.ifood_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Log de eventos recebidos do iFood (auditoria)
CREATE TABLE IF NOT EXISTS public.ifood_event_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  order_external_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_ifood_event_log_client_created
  ON public.ifood_event_log (client_id, created_at DESC);

ALTER TABLE public.ifood_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver eventos ifood do proprio cliente"
  ON public.ifood_event_log
  FOR SELECT
  TO authenticated
  USING (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

-- 4. Cache de token (sem acesso de usuários — apenas service_role)
CREATE TABLE IF NOT EXISTS public.ifood_token_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment text NOT NULL UNIQUE,
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ifood_token_cache ENABLE ROW LEVEL SECURITY;
-- Sem policies = só service_role acessa

-- 5. Campos de origem de pedido na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'avulso'
    CHECK (origin IN ('avulso','mesa','loja','ifood')),
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS ifood_status text,
  ADD COLUMN IF NOT EXISTS approval_status text
    CHECK (approval_status IN ('pendente','aprovado','rejeitado'));

CREATE INDEX IF NOT EXISTS idx_orders_external
  ON public.orders (client_id, external_order_id)
  WHERE external_order_id IS NOT NULL;