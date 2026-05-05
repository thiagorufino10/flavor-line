import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFood99Enabled } from "@/hooks/useFood99Enabled";
import { AppLayout } from "@/components/AppLayout";

export default function LojaFood99() {
  const navigate = useNavigate();
  const { enabled, loading } = useFood99Enabled();

  if (loading) {
    return (
      <AppLayout title="Loja 99Food">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!enabled) {
    return (
      <AppLayout title="Loja 99Food">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Indisponível</CardTitle>
            <CardDescription>
              A integração 99Food não está habilitada para este cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Loja 99Food"
      subtitle="Status da loja e horários de funcionamento"
      actions={<Badge variant="secondary">Em breve</Badge>}
    >
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Status da loja</CardTitle>
            <CardDescription>
              Abrir, pausar ou fechar a loja no 99Food. Disponível após cadastrar credenciais.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Esta seção será habilitada após a criação do app no portal e o cadastro das credenciais
            (App Key, App Secret e Merchant ID).
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários de funcionamento</CardTitle>
            <CardDescription>Sincronizar horários por turno com o 99Food.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Em breve.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pausas e interrupções</CardTitle>
            <CardDescription>
              Programar pausa rápida (ex: cozinha sobrecarregada) sem fechar a loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Em breve.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
