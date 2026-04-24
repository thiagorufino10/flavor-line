import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TableEntity {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface TableSession {
  id: string;
  table_id: string;
  customer_name: string | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface TableWithSession {
  table: TableEntity;
  openSession: TableSession | null;
  consumed: number; // soma dos pedidos
  paid: number;     // soma dos pagamentos (bruto cobrado do cliente)
}

export const useTablesOverview = () => {
  const [data, setData] = useState<TableWithSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: tables }, { data: sessions }] = await Promise.all([
      supabase.from("tables").select("id, name, active, sort_order").eq("active", true).order("sort_order").order("name"),
      supabase.from("table_sessions").select("id, table_id, customer_name, status, opened_at, closed_at").eq("status", "aberta"),
    ]);

    const sessionIds = (sessions || []).map((s) => s.id);
    let ordersBySession: Record<string, number> = {};
    let paymentsBySession: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const [{ data: orders }, { data: payments }] = await Promise.all([
        supabase.from("orders").select("table_session_id, total_amount").in("table_session_id", sessionIds),
        supabase.from("session_payments").select("table_session_id, amount").in("table_session_id", sessionIds),
      ]);
      (orders || []).forEach((o: any) => {
        if (!o.table_session_id) return;
        ordersBySession[o.table_session_id] = (ordersBySession[o.table_session_id] || 0) + Number(o.total_amount);
      });
      (payments || []).forEach((p: any) => {
        paymentsBySession[p.table_session_id] = (paymentsBySession[p.table_session_id] || 0) + Number(p.amount);
      });
    }

    const sessionByTable: Record<string, TableSession> = {};
    (sessions || []).forEach((s) => { sessionByTable[s.table_id] = s as TableSession; });

    const result: TableWithSession[] = (tables || []).map((t) => {
      const sess = sessionByTable[t.id] || null;
      return {
        table: t as TableEntity,
        openSession: sess,
        consumed: sess ? (ordersBySession[sess.id] || 0) : 0,
        paid: sess ? (paymentsBySession[sess.id] || 0) : 0,
      };
    });

    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("tables-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "session_payments" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { data, loading, refetch: fetchAll };
};

export const openTableSession = async (tableId: string, clientId: string, customerName?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("table_sessions")
    .insert({
      table_id: tableId,
      client_id: clientId,
      customer_name: customerName?.trim() || null,
      status: "aberta",
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const closeTableSession = async (sessionId: string) => {
  const { error } = await supabase
    .from("table_sessions")
    .update({ status: "fechada", closed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
};
