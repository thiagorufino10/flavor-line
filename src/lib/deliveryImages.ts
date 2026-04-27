// Mapa de imagens dos itens do cardápio de delivery por product_key.
// As imagens permanecem no bundle; admin edita apenas nome/preço/descrição.
import imgFrango from "@/assets/malukus/batata-frango.jpeg";
import imgFrangoCalabresa from "@/assets/malukus/batata-frango-calabresa.jpeg";
import imgFrangoCalabresaBacon from "@/assets/malukus/batata-frango-calabresa-bacon.jpeg";
import imgFrangoBacon from "@/assets/malukus/batata-frango-bacon.jpeg";
import imgCalabresa from "@/assets/malukus/batata-calabresa.jpeg";
import imgBacon from "@/assets/malukus/batata-bacon.jpeg";
import imgBaconCalabresa from "@/assets/malukus/batata-bacon-calabresa.jpeg";
import imgTradicional from "@/assets/malukus/batata-tradicional.jpeg";

import imgCoca1L from "@/assets/drinks/coca-1l.jpg";
import imgCocaLata from "@/assets/drinks/coca-lata.jpg";
import imgH2o from "@/assets/drinks/h2o.webp";
import imgH2oLimoneto from "@/assets/drinks/h2o-limoneto.jpg";
import imgAguaMineral from "@/assets/drinks/agua-mineral.webp";
import imgAguaGas from "@/assets/drinks/agua-gas.webp";
import imgCorona from "@/assets/drinks/corona.jpg";
import imgHeineken from "@/assets/drinks/heineken.jpg";
import imgBudweiser from "@/assets/drinks/budweiser.jpg";

export const DELIVERY_IMAGES: Record<string, string> = {
  frango: imgFrango,
  "frango-calabresa": imgFrangoCalabresa,
  "frango-calabresa-bacon": imgFrangoCalabresaBacon,
  "frango-bacon": imgFrangoBacon,
  calabresa: imgCalabresa,
  bacon: imgBacon,
  "bacon-calabresa": imgBaconCalabresa,
  tradicional: imgTradicional,
  "coca-1l": imgCoca1L,
  "coca-lata": imgCocaLata,
  h2o: imgH2o,
  "h2o-limoneto": imgH2oLimoneto,
  "agua-mineral": imgAguaMineral,
  "agua-gas": imgAguaGas,
  "cerveja-corona": imgCorona,
  "cerveja-heineken": imgHeineken,
  "cerveja-budweiser": imgBudweiser,
};

export const getDeliveryImage = (key: string) => DELIVERY_IMAGES[key] || "";
