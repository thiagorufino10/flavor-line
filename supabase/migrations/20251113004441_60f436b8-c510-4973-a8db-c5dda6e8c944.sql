-- Criar tabela de relacionamento entre complementos e itens do menu
CREATE TABLE IF NOT EXISTS public.complement_menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complement_id uuid NOT NULL REFERENCES public.complements(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(complement_id, menu_item_id)
);

-- Habilitar RLS
ALTER TABLE public.complement_menu_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem ver vínculos de complementos"
  ON public.complement_menu_items
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar vínculos"
  ON public.complement_menu_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar índices para melhor performance
CREATE INDEX idx_complement_menu_items_complement ON public.complement_menu_items(complement_id);
CREATE INDEX idx_complement_menu_items_menu_item ON public.complement_menu_items(menu_item_id);