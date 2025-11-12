-- Criar bucket público para logos do sistema
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-logos', 'system-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir que usuários autenticados façam upload de logos
CREATE POLICY "Usuários autenticados podem fazer upload de logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'system-logos');

-- Permitir que qualquer um visualize as logos (bucket público)
CREATE POLICY "Logos são publicamente acessíveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'system-logos');

-- Permitir que usuários autenticados atualizem logos
CREATE POLICY "Usuários autenticados podem atualizar logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'system-logos');

-- Permitir que usuários autenticados deletem logos antigas
CREATE POLICY "Usuários autenticados podem deletar logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'system-logos');