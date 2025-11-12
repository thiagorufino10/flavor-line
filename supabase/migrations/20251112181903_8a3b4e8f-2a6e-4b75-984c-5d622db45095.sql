-- Criar tabela de pedidos
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens do pedido
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  complements JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Criar sequência para números de pedido
CREATE SEQUENCE order_number_seq START 100;

-- Função para gerar número de pedido automaticamente
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := nextval('order_number_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número de pedido
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acesso a todos por enquanto - ideal para sistema interno)
CREATE POLICY "Allow all access to orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all access to order_items" ON public.order_items FOR ALL USING (true);

-- Habilitar realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;