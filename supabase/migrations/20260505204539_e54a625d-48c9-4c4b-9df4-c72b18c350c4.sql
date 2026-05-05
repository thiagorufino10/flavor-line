ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS food99_enabled boolean NOT NULL DEFAULT false;
UPDATE public.clients SET food99_enabled = true WHERE lower(name) = 'teste';