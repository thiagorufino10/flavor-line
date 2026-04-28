CREATE POLICY "Public pode ler clientes ativos"
ON public.clients
FOR SELECT
TO anon, authenticated
USING (active = true);