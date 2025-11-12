import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SaleDetail {
  produto: string;
  formaPagamento: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export const useSales = (startDate?: Date, endDate?: Date) => {
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `);

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

      // Transformar dados em formato de vendas detalhadas
      const salesDetails: SaleDetail[] = [];
      
      data?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          salesDetails.push({
            produto: item.product_name,
            formaPagamento: order.payment_method,
            quantidade: item.quantity,
            valorUnitario: parseFloat(item.unit_price),
            valorTotal: parseFloat(item.total_price),
          });
        });
      });

      setSales(salesDetails);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  return {
    sales,
    loading,
    refetch: fetchSales,
  };
};
