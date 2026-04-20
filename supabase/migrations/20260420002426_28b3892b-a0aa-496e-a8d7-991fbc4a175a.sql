
-- 1. APAGAR DADOS EXISTENTES
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.complement_menu_items CASCADE;
TRUNCATE TABLE public.complements CASCADE;
TRUNCATE TABLE public.menu_items CASCADE;
TRUNCATE TABLE public.cash_flow_transactions CASCADE;
TRUNCATE TABLE public.payment_rates CASCADE;
TRUNCATE TABLE public.system_settings CASCADE;
TRUNCATE TABLE public.printer_config CASCADE;
TRUNCATE TABLE public.user_roles CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
DELETE FROM auth.users;

-- 2. NOVO ROLE
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 3. TABELA clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. CLIENT_ID NAS TABELAS
ALTER TABLE public.profiles                ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.profiles                ADD COLUMN username  text;
ALTER TABLE public.user_roles              ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.menu_items              ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.complements             ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.complement_menu_items   ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.orders                  ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.order_items             ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.cash_flow_transactions  ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.payment_rates           ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.system_settings         ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.printer_config          ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;

-- ÍNDICES DE UNICIDADE
CREATE UNIQUE INDEX profiles_client_username_unique
  ON public.profiles(client_id, lower(username))
  WHERE username IS NOT NULL AND client_id IS NOT NULL;

CREATE UNIQUE INDEX payment_rates_client_method_unique
  ON public.payment_rates(client_id, payment_method);

CREATE UNIQUE INDEX system_settings_client_key_unique
  ON public.system_settings(client_id, key);
