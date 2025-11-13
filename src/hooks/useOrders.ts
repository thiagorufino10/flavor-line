import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  complements?: any;
  observations?: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export const useOrders = (status?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price,
            complements,
            observations
          )
        `)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear os dados para incluir os itens como "items"
      const formattedOrders = data?.map((order: any) => ({
        ...order,
        items: order.order_items || [],
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Configurar realtime
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  const createOrder = async (
    customerName: string,
    paymentMethod: string,
    totalAmount: number,
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      complements?: any;
      observations?: string;
    }>
  ) => {
    try {
      // Calcular valor líquido para armazenar no pedido
      let amountReceived = totalAmount;
      
      if (paymentMethod === "credito" || paymentMethod === "debito") {
        // Buscar taxa do banco
        const { data: rateData } = await supabase
          .from("payment_rates")
          .select("rate_percentage")
          .eq("payment_method", paymentMethod)
          .maybeSingle();

        if (rateData) {
          const rate = parseFloat(String(rateData.rate_percentage));
          const taxAmount = totalAmount * rate / 100;
          amountReceived = totalAmount - taxAmount;
        }
      }

      // Inserir pedido com o valor líquido (descontada a taxa)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          customer_name: customerName,
          payment_method: paymentMethod,
          total_amount: amountReceived, // Valor líquido que entra no caixa
          status: "novo",
          order_number: 0, // Será gerado pelo trigger
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Inserir itens
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        complements: item.complements || null,
        observations: item.observations || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success(`Pedido #${order.order_number} criado com sucesso!`);
      return order;
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido");
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Status atualizado!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  return {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    refetch: fetchOrders,
  };
};
