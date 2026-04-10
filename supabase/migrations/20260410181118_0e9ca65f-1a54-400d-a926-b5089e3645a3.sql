
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem ver configurações"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admins podem gerenciar configurações"
ON public.system_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir valor padrão
INSERT INTO public.system_settings (key, value) VALUES ('operation_mode', 'display');
