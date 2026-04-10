CREATE TABLE public.printer_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_type text NOT NULL DEFAULT 'thermal',
  connection_type text NOT NULL DEFAULT 'network',
  ip_address text DEFAULT '192.168.1.100',
  port text DEFAULT '9100',
  usb_port text DEFAULT '',
  printer_name text DEFAULT 'Impressora',
  paper_width text DEFAULT '80mm',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.printer_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem ver config da impressora"
  ON public.printer_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar config da impressora"
  ON public.printer_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.printer_config (printer_type, connection_type, ip_address, port, usb_port, printer_name, paper_width)
VALUES ('thermal', 'network', '192.168.1.100', '9100', '', 'Impressora', '80mm');