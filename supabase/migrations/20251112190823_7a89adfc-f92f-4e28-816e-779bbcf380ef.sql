-- Corrigir o search_path da função create_admin_user
DROP FUNCTION IF EXISTS create_admin_user();

CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Verifica se já existe um usuário admin
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@pastelfavorite.local'
  LIMIT 1;
  
  -- Se não existir, precisamos criar via aplicação
  -- Esta função serve apenas para garantir que o role seja atribuído
  IF admin_user_id IS NOT NULL THEN
    -- Garante que o admin tem o role correto
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Garante que existe um perfil
    INSERT INTO public.profiles (id, full_name)
    VALUES (admin_user_id, 'Administrador')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Administrador';
  END IF;
END;
$$;