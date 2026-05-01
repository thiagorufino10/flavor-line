DROP POLICY IF EXISTS "Public pode ler whatsapp_orders_number" ON public.system_settings;
CREATE POLICY "Public pode ler config loja online"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('whatsapp_orders_number', 'store_closed'));