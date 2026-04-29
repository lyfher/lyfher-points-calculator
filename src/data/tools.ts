export interface Tool {
  name: string;
  description: string;
  descriptionEs: string;
  logoEmoji: string;
  logoSrc?: string;
  accentHex: string;
  referralLink: string;
  referralBenefit: string;
  referralBenefitEs: string;
  tag: string;
  tagEs: string;
}

export const tools: Tool[] = [
  {
    name: "TreadFi",
    description: "Automate your perpetuals volume to farm more points efficiently. The best bot for perp farming.",
    descriptionEs: "Automatiza tu volumen en perpetuos para farmear más puntos eficientemente. El mejor bot para farming de perps.",
    logoEmoji: "🤖",
    accentHex: "#3B82F6",
    referralLink: "https://tread.fi?ref=POD05ZYR",
    referralBenefit: "20% discount on subscription",
    referralBenefitEs: "20% de descuento en la suscripción",
    tag: "Volume Bot",
    tagEs: "Bot de Volumen",
  },
];
