-- 1. Criar tabela categories
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (client_id, slug)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver categorias do proprio cliente"
ON public.categories FOR SELECT TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Gerenciar categorias do proprio cliente"
ON public.categories FOR ALL TO authenticated
USING (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (client_id = get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Substituir coluna category (enum) por category_id (uuid) em menu_items
ALTER TABLE public.menu_items DROP COLUMN category;
ALTER TABLE public.menu_items ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT;
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);

-- 3. Substituir coluna category (enum) por category_id (uuid) em complements
ALTER TABLE public.complements DROP COLUMN category;
ALTER TABLE public.complements ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT;
CREATE INDEX idx_complements_category_id ON public.complements(category_id);

-- 4. Drop do enum (não é mais usado)
DROP TYPE public.product_category;

-- 5. Bucket público de imagens de categorias
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Imagens de categoria publicamente legiveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Admins do cliente fazem upload de imagens de categoria"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'category-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_client_id()::text
);

CREATE POLICY "Admins do cliente atualizam imagens de categoria"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'category-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_client_id()::text
);

CREATE POLICY "Admins do cliente removem imagens de categoria"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'category-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_client_id()::text
);