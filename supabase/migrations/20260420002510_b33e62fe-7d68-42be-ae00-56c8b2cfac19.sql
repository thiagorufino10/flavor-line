
-- =========================================================
-- FUNÇÕES SECURITY DEFINER
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_client_login(
  _client_name text,
  _username text
)
RETURNS TABLE(email text, client_id uuid, client_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email::text, p.client_id, c.active
  FROM public.profiles p
  JOIN public.clients c ON c.id = p.client_id
  JOIN auth.users u ON u.id = p.id
  WHERE lower(c.name) = lower(_client_name)
    AND lower(p.username) = lower(_username)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_super_admin_login(_username text)
RETURNS TABLE(email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.user_roles r ON r.user_id = p.id
  WHERE lower(p.username) = lower(_username)
    AND r.role = 'super_admin'::app_role
    AND p.client_id IS NULL
  LIMIT 1;
$$;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- clients
CREATE POLICY "Super admin gerencia clientes"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuarios veem o proprio cliente"
  ON public.clients FOR SELECT TO authenticated
  USING (id = public.get_user_client_id() OR public.is_super_admin(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Ver perfis do mesmo cliente"
  ON public.profiles FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id() OR id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Atualizar proprio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admin gerencia perfis"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Apenas admins podem atualizar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Apenas admins podem deletar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Apenas admins podem inserir roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios roles" ON public.user_roles;

CREATE POLICY "Ver roles do mesmo cliente"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR client_id = public.get_user_client_id()
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admin do cliente gerencia roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR public.is_super_admin(auth.uid())
  );

-- menu_items
DROP POLICY IF EXISTS "Admins e atendentes podem gerenciar cardápio" ON public.menu_items;
DROP POLICY IF EXISTS "Todos podem ver itens do cardápio" ON public.menu_items;

CREATE POLICY "Ver cardapio do proprio cliente"
  ON public.menu_items FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar cardapio do proprio cliente"
  ON public.menu_items FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  )
  WITH CHECK (
    client_id = public.get_user_client_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  );

-- complements
DROP POLICY IF EXISTS "Admins e atendentes podem gerenciar complementos" ON public.complements;
DROP POLICY IF EXISTS "Todos podem ver complementos" ON public.complements;

CREATE POLICY "Ver complementos do proprio cliente"
  ON public.complements FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar complementos do proprio cliente"
  ON public.complements FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  )
  WITH CHECK (
    client_id = public.get_user_client_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  );

-- complement_menu_items
DROP POLICY IF EXISTS "Admins e atendentes podem gerenciar vínculos" ON public.complement_menu_items;
DROP POLICY IF EXISTS "Todos podem ver vínculos de complementos" ON public.complement_menu_items;

CREATE POLICY "Ver vinculos do proprio cliente"
  ON public.complement_menu_items FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar vinculos do proprio cliente"
  ON public.complement_menu_items FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  )
  WITH CHECK (
    client_id = public.get_user_client_id()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  );

-- orders
DROP POLICY IF EXISTS "Allow all access to orders" ON public.orders;

CREATE POLICY "Acesso a pedidos do proprio cliente"
  ON public.orders FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

-- order_items
DROP POLICY IF EXISTS "Allow all access to order_items" ON public.order_items;

CREATE POLICY "Acesso a itens de pedidos do proprio cliente"
  ON public.order_items FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

-- cash_flow_transactions
DROP POLICY IF EXISTS "Apenas admins podem gerenciar transações" ON public.cash_flow_transactions;
DROP POLICY IF EXISTS "Todos podem ver transações" ON public.cash_flow_transactions;

CREATE POLICY "Ver transacoes do proprio cliente"
  ON public.cash_flow_transactions FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar transacoes do proprio cliente"
  ON public.cash_flow_transactions FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

-- payment_rates
DROP POLICY IF EXISTS "Apenas admins podem gerenciar taxas" ON public.payment_rates;
DROP POLICY IF EXISTS "Todos podem ver taxas de pagamento" ON public.payment_rates;

CREATE POLICY "Ver taxas do proprio cliente"
  ON public.payment_rates FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar taxas do proprio cliente"
  ON public.payment_rates FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

-- system_settings
DROP POLICY IF EXISTS "Apenas admins podem gerenciar configurações" ON public.system_settings;
DROP POLICY IF EXISTS "Todos autenticados podem ver configurações" ON public.system_settings;

CREATE POLICY "Ver configuracoes do proprio cliente"
  ON public.system_settings FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar configuracoes do proprio cliente"
  ON public.system_settings FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));

-- printer_config
DROP POLICY IF EXISTS "Apenas admins podem gerenciar config da impressora" ON public.printer_config;
DROP POLICY IF EXISTS "Todos autenticados podem ver config da impressora" ON public.printer_config;

CREATE POLICY "Ver config impressora do proprio cliente"
  ON public.printer_config FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Gerenciar config impressora do proprio cliente"
  ON public.printer_config FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (client_id = public.get_user_client_id() AND has_role(auth.uid(), 'admin'::app_role));
