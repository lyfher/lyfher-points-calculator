export interface Scenario {
  label: string;
  labelEs: string;
  emoji: string;
  pricePerPoint: number;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  descriptionEs: string;
  logoEmoji: string;  // fallback si no hay imagen
  logoSrc?: string;   // ruta en /public, ej: /logos/pacifica.png
  accentHex: string;
  referralLink: string;
  referralBenefit: string;
  referralBenefitEs: string;
  sliderMax: number;  // máximo razonable para el slider de precio/punto
  scenarios: Scenario[];
}

export const projects: Project[] = [
  {
    slug: "pacifica",
    name: "Pacifica",
    description: "Calculate the estimated value of your Pacifica points across different price scenarios.",
    descriptionEs: "Calcula el valor estimado de tus puntos de Pacifica en distintos escenarios de precio.",
    logoEmoji: "🌊",
    logoSrc: "/logos/pacifica.jpg",
    accentHex: "#06B6D4",   // cyan
    referralLink: "https://app.pacifica.fi?referral=Lyfher",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 1,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 0.1 },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 0.2 },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 0.3 },
    ],
  },
  {
    slug: "extended",
    name: "Extended",
    description: "Calculate the estimated value of your Extended points across different price scenarios.",
    descriptionEs: "Calcula el valor estimado de tus puntos de Extended en distintos escenarios de precio.",
    logoEmoji: "📈",
    logoSrc: "/logos/extended.jpg",
    accentHex: "#10B981",   // emerald
    referralLink: "https://app.extended.exchange/join/LYFHER",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 10,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 1 },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 2 },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 3 },
    ],
  },
  {
    slug: "01",
    name: "01 Exchange",
    description: "Calculate the estimated value of your 01 Exchange points across different price scenarios.",
    descriptionEs: "Calcula el valor estimado de tus puntos de 01 Exchange en distintos escenarios de precio.",
    logoEmoji: "⚡",
    logoSrc: "/logos/01.svg",
    accentHex: "#F59E0B",   // amber
    referralLink: "https://01.xyz/ref/Lyfher",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 20,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 1 },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 3 },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 5 },
    ],
  },
  {
    slug: "hibachi",
    name: "Hibachi",
    description: "Calculate the estimated value of your Hibachi points across different price scenarios.",
    descriptionEs: "Calcula el valor estimado de tus puntos de Hibachi en distintos escenarios de precio.",
    logoEmoji: "🔥",
    logoSrc: "/logos/hibachi.jpg",
    accentHex: "#EF4444",   // red
    referralLink: "https://hibachi.xyz/r/lyfher",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 10,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 0.5 },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 1 },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 1.5 },
    ],
  },
];
