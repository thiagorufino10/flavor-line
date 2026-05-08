import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SaleDetail {
  produto: string;
  formaPagamento: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  clienteNome: string;
  numeroPedido: number;
  dataPedido: string;
  status: string;
}

export interface OrderSummary {
  id: string;
  order_number: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items_count: number;
}

export const useSales = (startDate?: Date, endDate?: Date) => {
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const salesDetails: SaleDetail[] = [];
      const orderSummaries: OrderSummary[] = [];

      data?.forEach((order: any) => {
        orderSummaries.push({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total_amount: parseFloat(order.total_amount),
          payment_method: order.payment_method,
          status: order.status,
          created_at: order.created_at,
          items_count: order.order_items?.length || 0,
        });

        order.order_items?.forEach((item: any) => {
          salesDetails.push({
            produto: item.product_name,
            formaPagamento: order.payment_method,
            quantidade: item.quantity,
            valorUnitario: parseFloat(item.unit_price),
            valorTotal: parseFloat(item.total_price),
            clienteNome: order.customer_name,
            numeroPedido: order.order_number,
            dataPedido: order.created_at,
            status: order.status,
          });
        });
      });

      setSales(salesDetails);
      setOrders(orderSummaries);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      setSales([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  return {
    sales,
    orders,
    loading,
    refetch: fetchSales,
  };
};
