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
  origin?: string;
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

  // Calcula o valor BRUTO que o cliente efetivamente paga (o que sai impresso na comanda).
  // - Se o cliente paga a taxa: bruto = valor + taxa
  // - Se o estabelecimento paga: bruto = valor (a taxa é absorvida pelo caixa, não pelo cliente)
  const calculateClientAmount = async (method: string, amount: number): Promise<number> => {
    if (method !== "credito" && method !== "debito") return amount;

    const { data: rateData } = await supabase
      .from("payment_rates")
      .select("rate_percentage")
      .eq("payment_method", method)
      .maybeSingle();

    if (!rateData) return amount;

    const rate = parseFloat(String(rateData.rate_percentage));
    const taxAmount = amount * rate / 100;

    const { data: taxPayerSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", `tax_payer_${method}`)
      .maybeSingle();

    const clientePaga = (taxPayerSetting?.value || (method === "credito" ? "cliente" : "estabelecimento")) === "cliente";

    // Cliente paga a taxa => valor cobrado é maior. Caso contrário, paga o valor cheio.
    return clientePaga ? amount + taxAmount : amount;
  };

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
    }>,
    splitPayments?: Array<{ method: string; amount: number }>
  ) => {
    try {
      // Pega client_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await supabase
        .from("profiles").select("client_id").eq("id", user.id).maybeSingle();
      const clientId = profile?.client_id;
      if (!clientId) throw new Error("Usuário sem cliente vinculado");

      let amountReceived: number;
      if (splitPayments && splitPayments.length === 2) {
        const grosses = await Promise.all(
          splitPayments.map(sp => calculateClientAmount(sp.method, sp.amount))
        );
        amountReceived = grosses[0] + grosses[1];
      } else {
        amountReceived = await calculateClientAmount(paymentMethod, totalAmount);
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          client_id: clientId,
          customer_name: customerName,
          payment_method: paymentMethod,
          total_amount: amountReceived,
          status: "novo",
          order_number: 0,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        client_id: clientId,
        order_id: order.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        complements: item.complements || null,
        observations: item.observations || null,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
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
    // Atualização otimista — atualiza UI imediatamente
    const previous = orders;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      )
    );

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
      // Reverte caso falhe
      setOrders(previous);
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
