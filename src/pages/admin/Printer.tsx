import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Printer as PrinterIcon, ArrowLeft, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectUSBPrinters as detectConnectedUSBPrinters,
  isUSBSupported,
  type DetectedUSBPrinter,
} from "@/lib/usbPrinters";

const Printer = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("printerConfig");
    return saved ? JSON.parse(saved) : {
      printerType: "thermal",
      connectionType: "network",
      ipAddress: "192.168.1.100",
      port: "9100",
      usbPort: "",
      printerName: "Zebra ZD220",
      paperWidth: "80mm",
    };
  });
  const [availablePrinters, setAvailablePrinters] = useState<DetectedUSBPrinter[]>([]);
  const [detectingPrinters, setDetectingPrinters] = useState(false);

  const handleDetectUSBPrinters = async () => {
    setDetectingPrinters(true);
    try {
      if (!isUSBSupported()) {
        toast.error("Seu navegador não suporta detecção USB. Use Chrome, Edge ou Opera.");
        return;
      }

      const printers = await detectConnectedUSBPrinters();
      setAvailablePrinters(printers);

      if (printers.length > 0) {
        setConfig((current) => ({
          ...current,
          usbPort: printers[0].id,
          printerName: printers[0].name,
        }));

        toast.success(`${printers.length} impressora(s) detectada(s)`, {
          description: "Selecione uma impressora da lista abaixo"
        });
      } else {
        toast.info("Nenhuma impressora USB foi detectada", {
          description: "Conecte a impressora Argox e autorize o acesso quando o navegador solicitar."
        });
      }
    } catch (error: any) {
      console.error("Erro ao detectar impressoras USB:", error);
      if (error.name === 'NotFoundError') {
        toast.info("Nenhuma impressora foi autorizada", {
          description: "Escolha a sua Argox na janela do navegador para concluir a detecção."
        });
      } else if (error.name === 'SecurityError') {
        toast.error("Acesso USB bloqueado", {
          description: "Verifique as permissões do navegador"
        });
      } else {
        toast.error("Erro ao detectar impressoras USB", {
          description: error.message || "Tente novamente"
        });
      }
    } finally {
      setDetectingPrinters(false);
    }
  };

  const handleSave = () => {
    if (config.connectionType === "network" && (!config.ipAddress || !config.port)) {
      toast.error("Preencha o endereço IP e porta para conexão de rede");
      return;
    }
    
    if (config.connectionType === "usb" && !config.usbPort) {
      toast.error("Preencha a porta USB");
      return;
    }

    localStorage.setItem("printerConfig", JSON.stringify(config));
    toast.success("Configurações da impressora salvas com sucesso!");
  };

  const handleTestPrint = () => {
    toast.info("Enviando página de teste para a impressora...", {
      description: "Esta é uma simulação. Configure a integração real com sua impressora.",
    });
    
    // Simulação de impressão de teste
    setTimeout(() => {
      toast.success("Página de teste enviada!", {
        description: "Verifique se a impressora recebeu o comando.",
      });
    }, 1500);
  };

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
                  <Label htmlFor="usbPort">Identificador USB</Label>
                  <Input
                    id="usbPort"
                    value={config.usbPort}
                    onChange={(e) => setConfig({ ...config, usbPort: e.target.value })}
                    placeholder="Preenchido automaticamente ao detectar"
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
              <Button onClick={handleSave} className="flex-1">
                Salvar Configurações
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
