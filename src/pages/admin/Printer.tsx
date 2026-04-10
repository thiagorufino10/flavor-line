import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Printer as PrinterIcon, ArrowLeft, TestTube, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DetectedUSBPrinter,
} from "@/lib/usbPrinters";
import { getSystemPrinters, printHtmlToSystemPrinter } from "@/lib/systemPrinter";

const Printer = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    printerType: "thermal",
    connectionType: "network",
    ipAddress: "192.168.1.100",
    port: "9100",
    usbPort: "",
    printerName: "Impressora",
    paperWidth: "80mm",
  });
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<DetectedUSBPrinter[]>([]);
  const [detectingPrinters, setDetectingPrinters] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("printer_config")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setConfigId(data.id);
          setConfig({
            printerType: data.printer_type,
            connectionType: data.connection_type,
            ipAddress: data.ip_address || "",
            port: data.port || "9100",
            usbPort: data.usb_port || "",
            printerName: data.printer_name || "Impressora",
            paperWidth: data.paper_width || "80mm",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Erro ao carregar configurações da impressora");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleDetectUSBPrinters = async () => {
    setDetectingPrinters(true);
    try {
      const printers = await getSystemPrinters();
      const detectedPrinters: DetectedUSBPrinter[] = printers.map((printerName) => ({
        id: printerName,
        label: printerName,
        name: printerName,
        manufacturer: "Sistema",
      }));

      setAvailablePrinters(detectedPrinters);

      if (detectedPrinters.length > 0) {
        setConfig((current) => ({
          ...current,
          usbPort: detectedPrinters[0].id,
          printerName: detectedPrinters[0].name,
        }));

        toast.success(`${detectedPrinters.length} impressora(s) detectada(s)`, {
          description: "Selecione a Argox instalada no Windows na lista abaixo"
        });
      } else {
        toast.info("Nenhuma impressora do sistema foi encontrada", {
          description: "Verifique se a Argox está instalada no Windows e se o QZ Tray está aberto."
        });
      }
    } catch (error: any) {
      console.error("Erro ao detectar impressoras do sistema:", error);
      toast.error("Erro ao detectar impressoras do sistema", {
        description:
          error?.message ||
          "Abra o QZ Tray e confirme que a impressora está instalada e autorizada no Windows.",
      });
    } finally {
      setDetectingPrinters(false);
    }
  };

  const handleSave = async () => {
    if (config.connectionType === "network" && (!config.ipAddress || !config.port)) {
      toast.error("Preencha o endereço IP e porta para conexão de rede");
      return;
    }
    
    if (config.connectionType === "usb" && !config.usbPort) {
      toast.error("Preencha a porta USB");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        printer_type: config.printerType,
        connection_type: config.connectionType,
        ip_address: config.ipAddress,
        port: config.port,
        usb_port: config.usbPort,
        printer_name: config.printerName,
        paper_width: config.paperWidth,
        updated_at: new Date().toISOString(),
      };

      if (configId) {
        const { error } = await supabase
          .from("printer_config")
          .update(payload)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("printer_config")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }

      // Também salvar no localStorage para uso offline na impressão
      localStorage.setItem("printerConfig", JSON.stringify(config));
      toast.success("Configurações da impressora salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações da impressora");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    if (config.connectionType !== "usb" || !(config.printerName || config.usbPort)) {
      toast.error("Detecte e selecione a impressora do sistema antes de testar.");
      return;
    }

    const now = new Date().toLocaleString("pt-BR");
    const paperWidth = config.paperWidth === "58mm" ? "58mm" : "80mm";
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidth} auto; margin: 4mm; }
    body { font-family: 'Courier New', monospace; color: #000; margin: 0; width: 100%; }
    .receipt { width: 100%; font-size: 12px; }
    .center { text-align: center; }
    .title { font-size: 16px; font-weight: 700; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .item { margin-bottom: 8px; }
    .name { font-weight: 700; }
    .sub { font-size: 10px; margin-left: 12px; }
    .obs { font-size: 10px; margin-left: 12px; font-weight: 700; }
    .total { font-weight: 700; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="title">PASTEL FAVORITE</div>
      <div>Comanda de Produção</div>
    </div>
    <div class="divider"></div>
    <div><strong>Pedido:</strong> #123</div>
    <div><strong>Cliente:</strong> JOÃO SILVA</div>
    <div><strong>Data/Hora:</strong> ${now}</div>
    <div class="divider"></div>
    <div><strong>ITENS:</strong></div>
    <div class="item">
      <div class="name">1x Pastel de Carne - R$ 8,00</div>
      <div class="sub">+ Batata palha</div>
      <div class="obs">OBS: Bem passado</div>
    </div>
    <div class="item">
      <div class="name">1x Açaí 300ml - R$ 15,00</div>
      <div class="sub">+ Morango</div>
      <div class="sub">+ Granola</div>
      <div class="obs">OBS: Sem leite condensado</div>
    </div>
    <div class="divider"></div>
    <div class="total">TOTAL: R$ 23,00</div>
    <div>Pagamento: Dinheiro</div>
    <div class="center" style="margin-top: 12px;">Obrigado pela preferência!</div>
  </div>
</body>
</html>`;

    try {
      toast.info("Enviando para a impressora do sistema...");
      await printHtmlToSystemPrinter(config.printerName || config.usbPort, htmlContent);
      toast.success("Comanda de teste enviada para a impressora configurada!");
    } catch (error: any) {
      console.error("Erro ao imprimir teste:", error);
      toast.error("Erro ao enviar para a impressora", {
        description: error.message || "Abra o QZ Tray e confirme se a Argox está instalada no Windows.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
            <PrinterIcon className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuração da Impressora</h1>
            <p className="text-muted-foreground">Configure a impressora de pedidos</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Impressora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="printerType">Tipo de Impressora</Label>
              <Select 
                value={config.printerType} 
                onValueChange={(value) => setConfig({ ...config, printerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal">Térmica</SelectItem>
                  <SelectItem value="zebra">Zebra</SelectItem>
                  <SelectItem value="epson">Epson</SelectItem>
                  <SelectItem value="bematech">Bematech</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="printerName">Nome da Impressora</Label>
              <Input
                id="printerName"
                value={config.printerName}
                onChange={(e) => setConfig({ ...config, printerName: e.target.value })}
                placeholder="Zebra ZD220"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionType">Tipo de Conexão</Label>
              <Select 
                value={config.connectionType} 
                onValueChange={(value) => setConfig({ ...config, connectionType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Rede (IP)</SelectItem>
                  <SelectItem value="usb">USB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.connectionType === "network" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">Endereço IP *</Label>
                  <Input
                    id="ipAddress"
                    value={config.ipAddress}
                    onChange={(e) => setConfig({ ...config, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">Porta *</Label>
                  <Input
                    id="port"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: e.target.value })}
                    placeholder="9100"
                  />
                </div>
              </>
            )}

            {config.connectionType === "usb" && (
              <>
                <div className="space-y-2">
                  <Label>Impressoras Detectadas</Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleDetectUSBPrinters}
                    disabled={detectingPrinters}
                    className="w-full"
                  >
                    {detectingPrinters ? "Detectando..." : "Detectar Impressoras USB"}
                  </Button>
                </div>

                {availablePrinters.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="detectedPrinter">Selecionar Impressora</Label>
                    <Select 
                      value={config.usbPort} 
                      onValueChange={(value) => {
                        const selectedPrinter = availablePrinters.find((printer) => printer.id === value);
                        setConfig({
                          ...config,
                          usbPort: value,
                          printerName: selectedPrinter ? selectedPrinter.name : config.printerName,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma impressora" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map((printer) => (
                          <SelectItem key={printer.id} value={printer.id}>
                            {printer.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="usbPort">Impressora do sistema</Label>
                  <Input
                    id="usbPort"
                    value={config.usbPort}
                    onChange={(e) => setConfig({ ...config, usbPort: e.target.value })}
                    placeholder="Nome da impressora no Windows"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="paperWidth">Largura do Papel</Label>
              <Select 
                value={config.paperWidth} 
                onValueChange={(value) => setConfig({ ...config, paperWidth: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
              <Button variant="outline" onClick={handleTestPrint} className="gap-2">
                <TestTube className="w-4 h-4" />
                Testar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visualização da Comanda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white text-black p-6 rounded-lg border-2 border-dashed border-gray-300 font-mono text-sm">
              <div className="text-center mb-4">
                <h2 className="font-bold text-lg">PASTEL FAVORITE</h2>
                <p className="text-xs">Comanda de Produção</p>
              </div>
              
              <div className="border-t border-b border-gray-400 py-2 my-2">
                <p><strong>Pedido:</strong> #123</p>
                <p><strong>Cliente:</strong> JOÃO SILVA</p>
                <p><strong>Data/Hora:</strong> 11/11/2025 14:30</p>
              </div>

              <div className="my-3">
                <p className="font-bold mb-2">ITENS:</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">1x Pastel de Carne - R$ 8,00</p>
                    <p className="text-xs ml-4">+ Batata palha</p>
                    <p className="text-xs ml-4 font-bold bg-yellow-200 inline-block px-2 py-0.5 mt-1">OBS: Bem passado</p>
                  </div>
                  <div>
                    <p className="font-semibold">1x Açaí 300ml - R$ 15,00</p>
                    <p className="text-xs ml-4">+ Morango</p>
                    <p className="text-xs ml-4">+ Granola</p>
                    <p className="text-xs ml-4 font-bold bg-yellow-200 inline-block px-2 py-0.5 mt-1">OBS: Sem leite condensado</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-400 pt-2 mt-3">
                <p className="font-bold">TOTAL: R$ 23,00</p>
                <p className="text-xs">Pagamento: Dinheiro</p>
              </div>

              <div className="text-center mt-4 text-xs">
                <p>Obrigado pela preferência!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instruções de Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">📋 Passo a passo:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Certifique-se de que a impressora está ligada e conectada à rede</li>
              <li>Identifique o endereço IP da impressora (geralmente impresso no relatório de configuração)</li>
              <li>Configure a porta de comunicação (padrão 9100 para impressoras térmicas)</li>
              <li>Selecione a largura correta do papel (58mm ou 80mm)</li>
              <li>Clique em "Testar" para enviar uma página de teste</li>
              <li>Salve as configurações quando tudo estiver funcionando</li>
            </ol>
          </div>

          <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>⚠️ Nota:</strong> Para integração real com impressoras térmicas, será necessário 
              implementar um serviço local ou usar a API de impressão do navegador. Esta interface 
              armazena apenas as configurações básicas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Printer;
