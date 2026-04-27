-- Tabela de pedidos do delivery (loja online via WhatsApp)
CREATE TABLE public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  service_type text NOT NULL DEFAULT 'delivery',
  neighborhood_name text,
  address_detail text,
  payment_method text NOT NULL,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  products_total numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'novo',
  printed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Público (loja online sem login) pode inserir pedido
CREATE POLICY "Public pode criar pedido delivery"
ON public.delivery_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Equipe do cliente pode ver/gerenciar
CREATE POLICY "Ver pedidos delivery do proprio cliente"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar pedidos delivery do proprio cliente"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (client_id = get_user_client_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role) OR has_role(auth.uid(), 'cozinha'::app_role)))
WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Excluir pedidos delivery do proprio cliente"
ON public.delivery_orders
FOR DELETE
TO authenticated
USING (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_delivery_orders_updated_at
BEFORE UPDATE ON public.delivery_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.delivery_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;

-- Índice
CREATE INDEX idx_delivery_orders_client_created ON public.delivery_orders (client_id, created_at DESC);

-- Permitir loja online (anon) descobrir o client_id pelo nome do bairro/whatsapp
-- O Loja.tsx usa whatsapp_orders_number — adicionamos um setting auxiliar para client_id público.
-- Na verdade já temos delivery_neighborhoods.client_id legível por anon (active=true), usaremos isso para inferir client_id.
