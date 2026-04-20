-- Substituir SELECT amplamente público por: público pode SELECT individual via URL conhecida (storage.objects.SELECT é o que controla list e getObject; bucket público já permite getObject sem RLS), e remover policy ampla de list.
DROP POLICY IF EXISTS "Imagens de categoria publicamente legiveis" ON storage.objects;

-- Apenas admins do próprio cliente podem listar (SELECT) os objetos do bucket.
-- O acesso público de leitura aos arquivos individuais continua funcionando porque o bucket é marcado como `public = true` (Supabase serve via /object/public/...).
CREATE POLICY "Admins do cliente listam imagens de categoria"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'category-images'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_client_id()::text
);