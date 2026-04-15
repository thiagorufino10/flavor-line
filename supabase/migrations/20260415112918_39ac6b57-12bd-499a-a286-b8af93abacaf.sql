
DROP POLICY IF EXISTS "Apenas admins podem gerenciar cardápio" ON public.menu_items;
CREATE POLICY "Admins e atendentes podem gerenciar cardápio"
ON public.menu_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

DROP POLICY IF EXISTS "Apenas admins podem gerenciar complementos" ON public.complements;
CREATE POLICY "Admins e atendentes podem gerenciar complementos"
ON public.complements FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

DROP POLICY IF EXISTS "Apenas admins podem gerenciar vínculos" ON public.complement_menu_items;
CREATE POLICY "Admins e atendentes podem gerenciar vínculos"
ON public.complement_menu_items FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));
