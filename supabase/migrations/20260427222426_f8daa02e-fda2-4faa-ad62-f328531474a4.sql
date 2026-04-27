CREATE POLICY "Public pode ler whatsapp_orders_number"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (key = 'whatsapp_orders_number');