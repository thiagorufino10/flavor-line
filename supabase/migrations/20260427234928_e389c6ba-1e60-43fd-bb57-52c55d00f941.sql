-- Tabela para o cardápio do delivery (Loja online)
CREATE TABLE IF NOT EXISTS public.delivery_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  product_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pastel','drink')),
  name text NOT NULL,
  description text,
  prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, product_key)
);

ALTER TABLE public.delivery_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public le cardapio delivery ativo"
ON public.delivery_menu_items FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Ver cardapio delivery do proprio cliente"
ON public.delivery_menu_items FOR SELECT
TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar cardapio delivery do proprio cliente"
ON public.delivery_menu_items FOR ALL
TO authenticated
USING ((client_id = get_user_client_id()) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((client_id = get_user_client_id()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_delivery_menu_items
BEFORE UPDATE ON public.delivery_menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();