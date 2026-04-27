CREATE TABLE public.delivery_neighborhoods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver bairros do proprio cliente"
ON public.delivery_neighborhoods
FOR SELECT
TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar bairros do proprio cliente"
ON public.delivery_neighborhoods
FOR ALL
TO authenticated
USING ((client_id = get_user_client_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)))
WITH CHECK ((client_id = get_user_client_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)));

CREATE POLICY "Public pode ler bairros ativos"
ON public.delivery_neighborhoods
FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE TRIGGER update_delivery_neighborhoods_updated_at
BEFORE UPDATE ON public.delivery_neighborhoods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_delivery_neighborhoods_client ON public.delivery_neighborhoods(client_id);