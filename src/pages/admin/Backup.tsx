import { useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/getClientId";

// Ordem importa: tabelas referenciadas (categorias, mesas, complementos) vêm antes
// das que dependem delas (itens de cardápio, sessões, pedidos) para respeitar as FKs.
const BACKUP_TABLES = [
  { table: "categories", label: "Categorias" },
  { table: "menu_items", label: "Itens do Cardápio" },
  { table: "complements", label: "Complementos" },
  { table: "complement_menu_items", label: "Vínculos de Complementos" },
  { table: "delivery_neighborhoods", label: "Bairros de Entrega" },
  { table: "delivery_menu_items", label: "Cardápio Delivery" },
  { table: "tables", label: "Mesas" },
  { table: "table_sessions", label: "Sessões de Mesa" },
  { table: "orders", label: "Pedidos" },
  { table: "order_items", label: "Itens de Pedidos" },
  { table: "delivery_orders", label: "Pedidos Delivery" },
  { table: "session_payments", label: "Pagamentos de Sessão" },
  { table: "cash_flow_transactions", label: "Fluxo de Caixa" },
  { table: "payment_rates", label: "Taxas de Pagamento" },
  { table: "printer_config", label: "Configuração de Impressora" },
  { table: "system_settings", label: "Configurações do Sistema" },
] as const;

interface BackupFile {
  version: number;
  exported_at?: string;
  tables: Record<string, any[]>;
}

const Backup = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const client_id = await getClientId();
      const db = supabase as any;
      const tables: Record<string, any[]> = {};

      for (const { table } of BACKUP_TABLES) {
        const { data, error } = await db.from(table).select("*").eq("client_id", client_id);
        if (error) throw new Error(`${table}: ${error.message}`);
        tables[table] = data ?? [];
      }

      const payload: BackupFile = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-tarmfood-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Backup gerado e baixado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar backup:", error);
      toast.error(`Erro ao gerar backup: ${error.message ?? "erro desconhecido"}`);
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || typeof parsed.tables !== "object") {
          throw new Error("Formato inválido");
        }
        setPendingImport(parsed as BackupFile);
        setConfirmOpen(true);
      } catch {
        toast.error("Arquivo de backup inválido. Selecione um arquivo .json gerado por este sistema.");
      } finally {
        e.target.value = "";
      }
    };
    reader.onerror = () => toast.error("Erro ao ler o arquivo.");
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    setImportProgress(0);
    try {
      const client_id = await getClientId();
      const db = supabase as any;
      const entries = BACKUP_TABLES.filter(
        ({ table }) => Array.isArray(pendingImport.tables[table]) && pendingImport.tables[table].length > 0
      );

      for (let i = 0; i < entries.length; i++) {
        const { table, label } = entries[i];
        const rows = (pendingImport.tables[table] as any[]).map((row) => ({ ...row, client_id }));

        const chunkSize = 500;
        for (let j = 0; j < rows.length; j += chunkSize) {
          const chunk = rows.slice(j, j + chunkSize);
          const { error } = await db.from(table).upsert(chunk, { onConflict: "id" });
          if (error) throw new Error(`${label}: ${error.message}`);
        }

        setImportProgress(Math.round(((i + 1) / entries.length) * 100));
      }

      toast.success("Backup importado com sucesso!");
      setConfirmOpen(false);
      setPendingImport(null);
    } catch (error: any) {
      console.error("Erro ao importar backup:", error);
      toast.error(`Erro ao importar backup: ${error.message ?? "erro desconhecido"}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout title="Backup" subtitle="Exporte ou importe todos os dados do sistema">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" /> Exportar Backup
            </CardTitle>
            <CardDescription>
              Gera um arquivo .json com todos os dados do seu sistema (cardápio, mesas, pedidos, financeiro, etc.)
              para guardar em um local seguro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? "Gerando backup..." : "Baixar backup completo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" /> Importar Backup
            </CardTitle>
            <CardDescription>
              Selecione um arquivo de backup gerado anteriormente para restaurar os dados. Os registros são
              adicionados ou atualizados — nada é apagado no processo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              Selecionar arquivo de backup
            </Button>

            {importing && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-muted-foreground">Importando... {importProgress}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="text-base">O que está incluso</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground grid gap-1 sm:grid-cols-2">
              {BACKUP_TABLES.map(({ table, label }) => (
                <li key={table}>• {label}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Usuários, senhas e integrações (iFood/99Food) não fazem parte deste backup por segurança e precisam
              ser configurados manualmente.
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (importing) return;
          setConfirmOpen(open);
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação de backup</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport?.exported_at
                ? `Este arquivo foi exportado em ${new Date(pendingImport.exported_at).toLocaleString("pt-BR")}. `
                : ""}
              Os dados do arquivo serão adicionados/atualizados no seu sistema agora. Essa ação não pode ser
              desfeita automaticamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmImport();
              }}
              disabled={importing}
            >
              {importing ? "Importando..." : "Confirmar e importar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Backup;
