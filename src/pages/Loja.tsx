import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Plus, Minus, Trash2, MessageCircle, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import logo from "@/assets/malukus-logo.jpeg";
import imgFrango from "@/assets/malukus/batata-frango.jpeg";
import imgFrangoCalabresa from "@/assets/malukus/batata-frango-calabresa.jpeg";
import imgFrangoBacon from "@/assets/malukus/batata-frango-bacon.jpeg";
import imgFrangoCalabresaBacon from "@/assets/malukus/batata-frango-calabresa-bacon.jpeg";
import imgCalabresa from "@/assets/malukus/batata-calabresa.jpeg";
import imgBacon from "@/assets/malukus/batata-bacon.jpeg";
import imgTradicional from "@/assets/malukus/batata-tradicional.jpeg";

type Size = "P" | "M" | "G" | "GG";

interface Product {
  id: string;
  name: string;
  image: string;
  description: string;
  prices: Record<Size, number>;
}

const PRODUCTS: Product[] = [
  {
    id: "frango",
    name: "Batata Frita com Frango",
    image: imgFrango,
    description: "Batata fresquinha + frango crocante",
    prices: { P: 20, M: 25, G: 32, GG: 38 },
  },
  {
    id: "frango-calabresa",
    name: "Batata Frita, Frango e Calabresa",
    image: imgFrangoCalabresa,
    description: "A combinação queridinha da casa",
    prices: { P: 23, M: 27, G: 33, GG: 40 },
  },
  {
    id: "frango-calabresa-bacon",
    name: "Batata Frita, Frango, Calabresa e Bacon",
    image: imgFrangoCalabresaBacon,
    description: "A explosão de sabores Malukus",
    prices: { P: 25, M: 29, G: 34, GG: 43 },
  },
  {
    id: "frango-bacon",
    name: "Batata Frita, Frango e Bacon",
    image: imgFrangoBacon,
    description: "Frango crocante com bacon dourado",
    prices: { P: 24, M: 28, G: 33, GG: 39 },
  },
  {
    id: "calabresa",
    name: "Batata Frita com Calabresa",
    image: imgCalabresa,
    description: "Calabresa defumada na medida",
    prices: { P: 15, M: 20, G: 25, GG: 33 },
  },
  {
    id: "bacon",
    name: "Batata Frita com Bacon",
    image: imgBacon,
    description: "Pra quem ama bacon dos bons",
    prices: { P: 20, M: 24, G: 28, GG: 35 },
  },
  {
    id: "bacon-calabresa",
    name: "Batata Frita, Bacon e Calabresa",
    image: imgBacon,
    description: "Bacon + calabresa, dupla imbatível",
    prices: { P: 24, M: 26, G: 30, GG: 35 },
  },
  {
    id: "tradicional",
    name: "Batata Frita Tradicional",
    image: imgTradicional,
    description: "Crocante por fora, macia por dentro",
    prices: { P: 10, M: 15, G: 21, GG: 30 },
  },
];

const SIZES: Size[] = ["P", "M", "G", "GG"];
const SIZE_LABEL: Record<Size, string> = {
  P: "Pequena",
  M: "Média",
  G: "Grande",
  GG: "Família",
};

interface CartItem {
  uid: string;
  productId: string;
  name: string;
  size: Size;
  price: number;
  quantity: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Loja = () => {
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size>("M");
  const [selectedQty, setSelectedQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  // SEO
  useEffect(() => {
    document.title = "Malukus Batata — Cardápio Online";
    const desc = "Cardápio online da Malukus Batata. Peça batatas crocantes com frango, calabresa e bacon direto pelo WhatsApp.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  // Load WhatsApp number from system_settings (any client — public read)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "whatsapp_orders_number")
        .maybeSingle();
      if (data?.value) setWhatsappNumber(String(data.value));
    })();
  }, []);

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((s, i) => s + i.quantity, 0),
    [cart]
  );

  const openProduct = (p: Product) => {
    setSelected(p);
    setSelectedSize("M");
    setSelectedQty(1);
  };

  const addToCart = () => {
    if (!selected) return;
    const price = selected.prices[selectedSize];
    setCart((prev) => {
      const found = prev.find(
        (i) => i.productId === selected.id && i.size === selectedSize
      );
      if (found) {
        return prev.map((i) =>
          i.uid === found.uid
            ? { ...i, quantity: i.quantity + selectedQty }
            : i
        );
      }
      return [
        ...prev,
        {
          uid: `${selected.id}-${selectedSize}-${Date.now()}`,
          productId: selected.id,
          name: selected.name,
          size: selectedSize,
          price,
          quantity: selectedQty,
        },
      ];
    });
    toast.success(`${selectedQty}x ${selected.name} (${selectedSize}) adicionado!`);
    setSelected(null);
  };

  const updateQty = (uid: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.uid === uid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (uid: string) => {
    setCart((prev) => prev.filter((i) => i.uid !== uid));
  };

  const sendToWhatsApp = () => {
    if (!customerName.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    if (!whatsappNumber) {
      toast.error("Número de WhatsApp da loja não configurado. Avise o estabelecimento.");
      return;
    }

    const lines = [
      `*🍟 Novo Pedido — Malukus Batata*`,
      ``,
      `*Cliente:* ${customerName}`,
      customerAddress.trim() ? `*Endereço:* ${customerAddress}` : null,
      ``,
      `*Itens:*`,
      ...cart.map(
        (i) =>
          `• ${i.quantity}x ${i.name} (${i.size}) — ${formatBRL(i.price * i.quantity)}`
      ),
      ``,
      `*Total: ${formatBRL(total)}*`,
      notes.trim() ? `\n*Observações:* ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const phone = whatsappNumber.replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
    setCheckoutOpen(false);
    setCartOpen(false);
    setCart([]);
    setCustomerName("");
    setCustomerAddress("");
    setNotes("");
    toast.success("Pedido enviado para o WhatsApp!");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-orange-600/30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Malukus Batata"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-orange-500/60"
            />
            <div>
              <h1 className="font-bold text-lg leading-tight text-orange-400">
                Malukus Batata
              </h1>
              <p className="text-xs text-zinc-400">Cardápio online</p>
            </div>
          </div>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button
                className="relative bg-orange-500 hover:bg-orange-600 text-white"
                size="sm"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Carrinho
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-900 text-zinc-100 border-zinc-800 w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle className="text-orange-400">Seu pedido</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-zinc-500 py-12">
                    Seu carrinho está vazio
                  </p>
                ) : (
                  cart.map((i) => (
                    <div
                      key={i.uid}
                      className="bg-zinc-800/60 rounded-lg p-3 flex gap-3 items-start"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{i.name}</p>
                        <p className="text-xs text-zinc-400">
                          Tamanho {i.size} · {formatBRL(i.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-zinc-700 bg-transparent"
                            onClick={() => updateQty(i.uid, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold w-6 text-center">
                            {i.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-zinc-700 bg-transparent"
                            onClick={() => updateQty(i.uid, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-400">
                          {formatBRL(i.price * i.quantity)}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 mt-1 text-zinc-500 hover:text-red-400"
                          onClick={() => removeItem(i.uid)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-orange-400">{formatBRL(total)}</span>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Finalizar pelo WhatsApp
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-orange-600/20">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, hsl(20 95% 55% / 0.4), transparent 50%), radial-gradient(circle at 80% 70%, hsl(35 95% 55% / 0.3), transparent 50%)",
          }}
        />
        <div className="container mx-auto px-4 py-12 sm:py-16 relative">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Batatas <span className="text-orange-400">malukamente</span>{" "}
              crocantes 🔥
            </h2>
            <p className="text-zinc-400 text-lg mb-6">
              Escolha sua combinação favorita, monte seu pedido e finalize direto
              pelo WhatsApp. Rapidinho.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <main className="container mx-auto px-4 py-8">
        <h3 className="text-2xl font-bold mb-6 text-orange-400">Cardápio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => (
            <Card
              key={p.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden cursor-pointer hover:border-orange-500/60 transition-all hover:scale-[1.02] group"
              onClick={() => openProduct(p)}
            >
              <div className="aspect-square overflow-hidden bg-black">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <h4 className="font-bold text-base mb-1">{p.name}</h4>
                <p className="text-xs text-zinc-400 mb-3">{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">A partir de</span>
                  <span className="text-orange-400 font-bold text-lg">
                    {formatBRL(p.prices.P)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-12 py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <img
            src={logo}
            alt="Malukus Batata"
            className="h-14 w-14 rounded-full mx-auto object-cover"
          />
          <p className="text-orange-400 font-bold">Malukus Batata</p>
          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} — Pedidos feitos via WhatsApp
          </p>
        </div>
      </footer>

      {/* Product modal — size + qty */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-800 max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-orange-400">
                  {selected.name}
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>

              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <img
                  src={selected.image}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">Escolha o tamanho</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`rounded-lg border-2 p-3 text-center transition-all ${
                        selectedSize === s
                          ? "border-orange-500 bg-orange-500/10 text-orange-400"
                          : "border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className="font-bold text-lg">{s}</div>
                      <div className="text-[10px] text-zinc-500">
                        {SIZE_LABEL[s]}
                      </div>
                      <div className="text-xs font-semibold mt-1">
                        {formatBRL(selected.prices[s])}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Quantidade</Label>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-zinc-700 bg-transparent"
                    onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="font-bold w-8 text-center text-lg">
                    {selectedQty}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-zinc-700 bg-transparent"
                    onClick={() => setSelectedQty((q) => q + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                  onClick={addToCart}
                >
                  Adicionar — {formatBRL(selected.prices[selectedSize] * selectedQty)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Seus dados</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Vamos enviar seu pedido pelo WhatsApp da Malukus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Seu nome *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Endereço (se for entrega)</Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Rua, número, bairro"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Ex: sem cebola, troco para R$ 50..."
                maxLength={200}
              />
            </div>

            <div className="bg-zinc-800/60 rounded-lg p-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-orange-400">{formatBRL(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
              onClick={sendToWhatsApp}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Enviar pedido pelo WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Loja;
