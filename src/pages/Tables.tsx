import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Users, Plus } from "lucide-react";
import { useTablesOverview, openTableSession } from "@/hooks/useTables";
import { formatBRL } from "@/lib/format";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";

const TablesPage = () => {
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { data, loading } = useTablesOverview();
  const [openDialog, setOpenDialog] = useState(false);
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");

  const handleTableClick = async (tableId: string, sessionId?: string | null) => {
    if (sessionId) {
      navigate(`/tables/${sessionId}`);
      return;
    }
    setPendingTableId(tableId);
    setCustomerName("");
    setOpenDialog(true);
  };

  const confirmOpen = async () => {
    if (!pendingTableId || !clientId) return;
    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    try {
      const session = await openTableSession(pendingTableId, clientId, customerName);
      setOpenDialog(false);
      navigate(`/tables/${session.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível abrir a mesa");
    }
  };

  return (
    <AppLayout title="Mesas" subtitle="Selecione uma mesa para abrir ou continuar a conta">
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16 text-muted-foreground space-y-3">
              <p>Nenhuma mesa cadastrada.</p>
              <Button onClick={() => navigate("/admin/tables")}>
                <Plus className="w-4 h-4 mr-2" /> Cadastrar mesas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.map(({ table, openSession, consumed, paid }) => {
              const balance = consumed - paid;
              const occupied = !!openSession;
              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table.id, openSession?.id)}
                  className={`group relative aspect-square rounded-xl border-2 overflow-hidden transition-all text-left p-4 flex flex-col justify-between ${
                    occupied
                      ? "border-warning bg-warning/10 hover:bg-warning/20"
                      : "border-border bg-card hover:border-primary hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-lg">{table.name}</span>
                    <Badge variant={occupied ? "default" : "secondary"}>
                      {occupied ? "Ocupada" : "Livre"}
                    </Badge>
                  </div>
                  {occupied ? (
                    <div className="space-y-1">
                      {openSession?.customer_name && (
                        <p className="text-xs flex items-center gap-1 text-muted-foreground truncate">
                          <Users className="w-3 h-3" /> {openSession.customer_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Consumo: {formatBRL(consumed)}</p>
                      <p className={`text-sm font-bold ${balance > 0 ? "text-destructive" : "text-success"}`}>
                        {balance > 0 ? `Devendo ${formatBRL(balance)}` : "Quitada"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Toque para abrir</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome do cliente</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmOpen()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button onClick={confirmOpen}>Abrir mesa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TablesPage;
