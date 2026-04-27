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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Plus, Minus, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import logo from "@/assets/malukus-logo.jpeg";
import { getDeliveryImage } from "@/lib/deliveryImages";

type Size = "P" | "M" | "G" | "GG";

interface Product {
  id: string;
  name: string;
  image: string;
  description: string;
  prices: Record<Size, number>;
}

// PRODUCTS e DRINKS são carregados do banco (delivery_menu_items)

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
  sauces: string[];
}

const SAUCES = [
  "Ketchup",
  "Maionese",
  "Barbecue",
  "Malukus",
  "Creme de alho",
  "Cheddar",
  "Baconeese",
] as const;

interface Drink {
  id: string;
  name: string;
  price: number;
  image: string;
}

const DRINKS: Drink[] = [
  { id: "coca-1l", name: "Coca Cola 1L", price: 10, image: imgCoca1L },
  { id: "coca-lata", name: "Coca Lata", price: 6, image: imgCocaLata },
  { id: "h2o", name: "H2O", price: 6, image: imgH2o },
  { id: "h2o-limoneto", name: "H2O Limoneto", price: 6, image: imgH2oLimoneto },
  { id: "agua-mineral", name: "Água Mineral", price: 2, image: imgAguaMineral },
  { id: "agua-gas", name: "Água com Gás", price: 4, image: imgAguaGas },
  { id: "cerveja-corona", name: "Cerveja Corona", price: 9, image: imgCorona },
  { id: "cerveja-heineken", name: "Cerveja Heineken", price: 9, image: imgHeineken },
  { id: "cerveja-budweiser", name: "Cerveja Budweiser", price: 9, image: imgBudweiser },
];

interface Neighborhood {
  id: string;
  name: string;
  delivery_fee: number;
  client_id: string;
}

type ServiceType = "delivery" | "retirada";
type PaymentMethod = "Dinheiro" | "Pix" | "Cartão" | "";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Loja = () => {
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size>("M");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("delivery");
  const [neighborhoodId, setNeighborhoodId] = useState<string>("");
  const [addressDetail, setAddressDetail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [notes, setNotes] = useState("");

  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

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

  // Load WhatsApp + delivery neighborhoods
  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { data: nb }] = await Promise.all([
        supabase
          .from("system_settings")
          .select("value")
          .eq("key", "whatsapp_orders_number")
          .maybeSingle(),
        supabase
          .from("delivery_neighborhoods")
          .select("id,name,delivery_fee,client_id")
          .eq("active", true)
          .order("name"),
      ]);
      if (cfg?.value) setWhatsappNumber(String(cfg.value));
      setNeighborhoods((nb as any[]) || []);
    })();
  }, []);

  const productsTotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((s, i) => s + i.quantity, 0),
    [cart]
  );
  const selectedNeighborhood = useMemo(
    () => neighborhoods.find((n) => n.id === neighborhoodId),
    [neighborhoodId, neighborhoods]
  );
  const deliveryFee =
    serviceType === "delivery" && selectedNeighborhood
      ? Number(selectedNeighborhood.delivery_fee)
      : 0;
  const grandTotal = productsTotal + deliveryFee;

  const openProduct = (p: Product) => {
    setSelected(p);
    setSelectedSize("M");
    setSelectedQty(1);
    setSelectedSauces([]);
  };

  const toggleSauce = (s: string) => {
    setSelectedSauces((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const addToCart = () => {
    if (!selected) return;
    const price = selected.prices[selectedSize];
    const saucesKey = [...selectedSauces].sort().join("|");
    setCart((prev) => {
      const found = prev.find(
        (i) =>
          i.productId === selected.id &&
          i.size === selectedSize &&
          [...i.sauces].sort().join("|") === saucesKey
      );
      if (found) {
        return prev.map((i) =>
          i.uid === found.uid ? { ...i, quantity: i.quantity + selectedQty } : i
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
          sauces: [...selectedSauces],
        },
      ];
    });
    toast.success(`${selectedQty}x ${selected.name} (${selectedSize}) adicionado!`);
    setSelected(null);
  };

  const addDrink = (drink: Drink) => {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === drink.id);
      if (found) {
        return prev.map((i) =>
          i.uid === found.uid ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          uid: `${drink.id}-${Date.now()}`,
          productId: drink.id,
          name: drink.name,
          size: "M",
          price: drink.price,
          quantity: 1,
          sauces: [],
        },
      ];
    });
    toast.success(`${drink.name} adicionado!`);
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

  const sendToWhatsApp = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio");
    if (!customerName.trim()) return toast.error("Informe seu nome");
    const phoneClean = customerPhone.replace(/\D/g, "");
    if (phoneClean.length < 10) return toast.error("Informe um telefone válido com DDD");
    if (!paymentMethod) return toast.error("Selecione o método de pagamento");
    if (serviceType === "delivery") {
      if (!neighborhoodId) return toast.error("Selecione o bairro de entrega");
      if (!addressDetail.trim()) return toast.error("Informe o endereço (rua, número)");
    }
    if (!whatsappNumber) {
      return toast.error("Número de WhatsApp da loja não configurado. Avise o estabelecimento.");
    }

    const now = new Date();
    const data = now.toLocaleDateString("pt-BR");
    const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const tipoServico = serviceType === "delivery" ? "Delivery" : "Retirada no local";
    const enderecoLinha =
      serviceType === "delivery"
        ? `${selectedNeighborhood?.name ?? ""}, ${addressDetail}`
        : "Retirada no local";

    const metodoPagamentoLinha =
      serviceType === "delivery"
        ? `${paymentMethod} - Para delivery`
        : `${paymentMethod} - Na retirada`;

    const itemLines = cart.flatMap((i) => {
      const total = i.price * i.quantity;
      const saucesLine = i.sauces.length > 0
        ? `  Molhos: ${i.sauces.join(", ")}`
        : `  Molhos: nenhum`;
      return [
        `- x${i.quantity} ${i.name} - ${i.size} ${formatBRL(total)}`,
        `  Preço unitário ${formatBRL(i.price)}`,
        saucesLine,
        ``,
      ];
    });

    const lines = [
      `Novo Pedido — Malukus Batata`,
      ``,
      `🗓️ ${data} ⏰ ${hora}`,
      ``,
      `*Tipo de serviço: ${tipoServico}*`,
      ``,
      `Nome: ${customerName}`,
      `Telefone: ${phoneClean}`,
      `Endereço: ${enderecoLinha}`,
      ``,
      `Método de pagamento: ${metodoPagamentoLinha}`,
      ``,
      `Status de pagamento: Não pago`,
      ``,
      `💲 Custos`,
      ``,
      `Preço dos produtos: ${formatBRL(productsTotal)}`,
      `Preço de entrega: ${formatBRL(deliveryFee)}`,
      `Total a pagar: ${formatBRL(grandTotal)}`,
      ``,
      `📝 Pedido`,
      ``,
      ...itemLines,
      notes.trim() ? `*Observações:* ${notes}` : null,
      notes.trim() ? `` : null,
      `👆 Após enviar o pedido, aguarde que já iremos lhe atender..`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    // Salva o pedido no banco para aparecer na tela de Delivery do estabelecimento
    try {
      const clientId =
        selectedNeighborhood?.client_id ?? neighborhoods[0]?.client_id;
      if (clientId) {
        await supabase.from("delivery_orders").insert({
          client_id: clientId,
          customer_name: customerName.trim(),
          customer_phone: phoneClean,
          service_type: serviceType,
          neighborhood_name: serviceType === "delivery" ? selectedNeighborhood?.name ?? null : null,
          address_detail: serviceType === "delivery" ? addressDetail.trim() : null,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          items: cart.map((i) => ({
            name: i.name,
            size: i.size,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: i.price * i.quantity,
            sauces: i.sauces,
          })),
          products_total: productsTotal,
          delivery_fee: deliveryFee,
          total_amount: grandTotal,
          status: "novo",
        });
      }
    } catch (err) {
      console.error("Falha ao salvar pedido delivery:", err);
    }

    const phone = whatsappNumber.replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");

    setCheckoutOpen(false);
    setCartOpen(false);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setAddressDetail("");
    setNeighborhoodId("");
    setPaymentMethod("");
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
                        {i.sauces.length > 0 && (
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Molhos: {i.sauces.join(", ")}
                          </p>
                        )}
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
                    <span>Subtotal</span>
                    <span className="text-orange-400">{formatBRL(productsTotal)}</span>
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
                <h4 className="font-bold text-base mb-1 text-white">{p.name}</h4>
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

        {/* Bebidas */}
        <h3 className="text-2xl font-bold mt-12 mb-6 text-orange-400">Bebidas 🥤</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {DRINKS.map((d) => (
            <Card
              key={d.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-orange-500/60 transition-all flex flex-col"
            >
              <div className="aspect-square overflow-hidden bg-white">
                <img
                  src={d.image}
                  alt={d.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <h4 className="font-bold text-sm text-white leading-tight">{d.name}</h4>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-orange-400 font-bold text-base">
                    {formatBRL(d.price)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => addDrink(d)}
                    className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-3"
                  >
                    + Adicionar
                  </Button>
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

      {/* Product modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          className="bg-zinc-900 text-zinc-100 border-zinc-800 max-w-md w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] p-0 gap-0 flex flex-col overflow-hidden"
        >
          {selected && (
            <>
              {/* Header com imagem de fundo */}
              <div className="relative h-40 sm:h-48 shrink-0 overflow-hidden">
                <img
                  src={selected.image}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                <DialogHeader className="absolute inset-x-0 bottom-0 p-4 text-left space-y-1">
                  <DialogTitle className="text-orange-400 text-xl drop-shadow">
                    {selected.name}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-200 text-xs drop-shadow">
                    {selected.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Corpo scrollável */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                <div>
                  <Label className="text-sm mb-2 block font-semibold">
                    Escolha o tamanho
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`rounded-lg border-2 p-2 text-center transition-all ${
                          selectedSize === s
                            ? "border-orange-500 bg-orange-500/10 text-orange-400"
                            : "border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        <div className="font-bold text-base">{s}</div>
                        <div className="text-[10px] text-zinc-500 leading-tight">
                          {SIZE_LABEL[s]}
                        </div>
                        <div className="text-xs font-semibold mt-1">
                          {formatBRL(selected.prices[s])}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block font-semibold">
                    Escolha o molho
                    <span className="block text-[11px] text-zinc-500 font-normal">
                      Opcional — pode marcar mais de um
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SAUCES.map((s) => {
                      const active = selectedSauces.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSauce(s)}
                          className={`rounded-lg border-2 px-3 py-2 text-sm text-left transition-all ${
                            active
                              ? "border-orange-500 bg-orange-500/10 text-orange-400"
                              : "border-zinc-700 hover:border-zinc-600 text-zinc-200"
                          }`}
                        >
                          {active ? "✓ " : ""}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Quantidade</Label>
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
              </div>

              {/* Footer fixo */}
              <div className="shrink-0 border-t border-zinc-800 p-4 bg-zinc-900">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                  onClick={addToCart}
                >
                  Adicionar — {formatBRL(selected.prices[selectedSize] * selectedQty)}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-800 max-w-lg w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Finalizar pedido</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Preencha seus dados — vamos enviar para o WhatsApp da loja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Seu nome"
                maxLength={80}
              />
            </div>

            <div>
              <Label>Telefone (WhatsApp) *</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Ex: 55 81 98711-8762"
                inputMode="tel"
                maxLength={20}
              />
            </div>

            <div>
              <Label>Tipo de serviço *</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Delivery (entrega)</SelectItem>
                  <SelectItem value="retirada">Retirada no local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {serviceType === "delivery" && (
              <>
                <div>
                  <Label>Bairro *</Label>
                  <Select value={neighborhoodId} onValueChange={setNeighborhoodId}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder={
                        neighborhoods.length === 0
                          ? "Nenhum bairro cadastrado pela loja"
                          : "Selecione seu bairro"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {neighborhoods.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} — {formatBRL(n.delivery_fee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Endereço (rua, número, referência) *</Label>
                  <Textarea
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="Ex: Rua Sete, 147 — em frente à igreja"
                    maxLength={200}
                    rows={2}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Método de pagamento *</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Ex: sem cebola, troco para R$ 50..."
                maxLength={200}
                rows={2}
              />
            </div>

            <div className="bg-zinc-800/60 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Produtos</span>
                <span>{formatBRL(productsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Entrega</span>
                <span>{formatBRL(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-1 border-t border-zinc-700">
                <span>Total</span>
                <span className="text-orange-400">{formatBRL(grandTotal)}</span>
              </div>
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
