ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_client_id_key_key UNIQUE (client_id, key);