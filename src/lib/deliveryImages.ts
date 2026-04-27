// Mapa de imagens dos itens do cardápio de delivery por product_key.
// As imagens permanecem no bundle; admin edita apenas nome/preço/descrição.
import imgFrango from "@/assets/batata-frango.jpg";
import imgFrangoCalabresa from "@/assets/batata-frango-calabresa.jpg";
import imgFrangoCalabresaBacon from "@/assets/batata-frango-calabresa-bacon.jpg";
import imgFrangoBacon from "@/assets/batata-frango-bacon.jpg";
import imgCalabresa from "@/assets/batata-calabresa.jpg";
import imgBacon from "@/assets/batata-bacon.jpg";
import imgBaconCalabresa from "@/assets/batata-bacon-calabresa.jpg";
import imgTradicional from "@/assets/batata-tradicional.jpg";

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
