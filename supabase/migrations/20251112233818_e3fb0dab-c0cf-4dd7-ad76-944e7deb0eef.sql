-- Modificar trigger para não depender de NULL, sempre gerar
DROP TRIGGER IF EXISTS set_order_number ON public.orders;

CREATE TRIGGER set_order_number 
  BEFORE INSERT ON public.orders 
  FOR EACH ROW 
  EXECUTE FUNCTION generate_order_number();