-- 1. Tabela de mesas
CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tables_client ON public.tables(client_id);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver mesas do proprio cliente"
ON public.tables FOR SELECT TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar mesas do proprio cliente"
ON public.tables FOR ALL TO authenticated
USING (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)))
WITH CHECK (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)));

CREATE TRIGGER tables_set_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Sessões de mesa (cada "abertura" da conta)
CREATE TABLE public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE RESTRICT,
  customer_name text,
  status text NOT NULL DEFAULT 'aberta', -- aberta | fechada
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_table_sessions_client ON public.table_sessions(client_id);
CREATE INDEX idx_table_sessions_table ON public.table_sessions(table_id);
CREATE INDEX idx_table_sessions_status ON public.table_sessions(status);

-- Garante apenas uma sessão aberta por mesa
CREATE UNIQUE INDEX uniq_open_session_per_table
ON public.table_sessions(table_id) WHERE status = 'aberta';

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver sessoes de mesa do proprio cliente"
ON public.table_sessions FOR SELECT TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar sessoes de mesa do proprio cliente"
ON public.table_sessions FOR ALL TO authenticated
USING (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)))
WITH CHECK (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)));

CREATE TRIGGER table_sessions_set_updated_at
BEFORE UPDATE ON public.table_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Pagamentos da sessão (múltiplos pagamentos parciais)
CREATE TABLE public.session_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  table_session_id uuid NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount numeric NOT NULL, -- valor bruto cobrado do cliente (já com taxa, se for o caso)
  net_amount numeric NOT NULL, -- valor que entra no caixa (descontada a taxa, se aplicável)
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_payments_client ON public.session_payments(client_id);
CREATE INDEX idx_session_payments_session ON public.session_payments(table_session_id);

ALTER TABLE public.session_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver pagamentos do proprio cliente"
ON public.session_payments FOR SELECT TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar pagamentos do proprio cliente"
ON public.session_payments FOR ALL TO authenticated
USING (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)))
WITH CHECK (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)));

-- 4. Vincular pedidos a sessões de mesa (opcional)
ALTER TABLE public.orders
ADD COLUMN table_session_id uuid REFERENCES public.table_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_table_session ON public.orders(table_session_id);