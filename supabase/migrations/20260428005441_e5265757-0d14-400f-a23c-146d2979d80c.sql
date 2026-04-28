CREATE OR REPLACE FUNCTION public.ensure_client_initial_admin(
  _client_id uuid,
  _user_id uuid,
  _username text,
  _full_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_username text;
  resolved_name text;
BEGIN
  clean_username := lower(trim(_username));
  resolved_name := COALESCE(NULLIF(trim(_full_name), ''), clean_username);

  IF _client_id IS NULL OR _user_id IS NULL OR clean_username = '' THEN
    RAISE EXCEPTION 'Dados insuficientes para criar usuário inicial';
  END IF;

  INSERT INTO public.profiles (id, client_id, username, full_name)
  VALUES (_user_id, _client_id, clean_username, resolved_name)
  ON CONFLICT (id) DO UPDATE
  SET client_id = EXCLUDED.client_id,
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      updated_at = now();

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND client_id = _client_id
      AND role = 'admin'::app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, client_id, role)
    VALUES (_user_id, _client_id, 'admin'::app_role);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_client_initial_admin(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_client_initial_admin(uuid, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.ensure_client_initial_admin(uuid, uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_client_initial_admin(uuid, uuid, text, text) TO service_role;