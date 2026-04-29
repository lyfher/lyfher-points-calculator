export interface Scenario {
  label: string;
  labelEs: string;
  emoji: string;
  pricePerPoint: number;
  fdv?: string;        // e.g. "$50M", "$1.2B"
  marketCap?: string;  // circulating mcap if different from FDV
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  descriptionEs: string;
  logoEmoji: string;
  logoSrc?: string;
  accentHex: string;
  referralLink: string;
  referralBenefit: string;
  referralBenefitEs: string;
  sliderMax: number;
  totalPointsPool?: number;  // total points in circulation (for matrix calculator)
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
    totalPointsPool: 400_000_000,
    referralLink: "https://app.pacifica.fi?referral=Lyfher",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 1,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 0.1, fdv: "$50M" },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 0.2, fdv: "$100M" },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 0.3, fdv: "$200M" },
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
    totalPointsPool: 52_780_000, // confirmed: 40.18M distributed + 12.6M remaining
    referralLink: "https://app.extended.exchange/join/LYFHER",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 10,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 1.4, fdv: "$250M" },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 2.8, fdv: "$500M" },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 5.7, fdv: "$1B" },
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
    totalPointsPool: 10_000_000, // confirmed: 01.xyz/points
    referralLink: "https://01.xyz/ref/Lyfher",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 20,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 1, fdv: "$100M" },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 3, fdv: "$300M" },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 5, fdv: "$500M" },
    ],
  },
  {
    slug: "dango",
    name: "Dango",
    description: "Calculate the estimated value of your Dango points across different price scenarios.",
    descriptionEs: "Calcula el valor estimado de tus puntos de Dango en distintos escenarios de precio.",
    logoEmoji: "🍡",
    logoSrc: "/logos/dangologo.jpg",
    accentHex: "#DD3756",
    totalPointsPool: 50_000_000, // confirmed: 38M campaign + 7.6M referral + 3.8M loot boxes
    referralLink: "https://dango.exchange?ref=6195",
    referralBenefit: "Sign up with my link and get a 30% fee rebate",
    referralBenefitEs: "Regístrate con mi link y obtén un 30% de rebate en fees",
    sliderMax: 10,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 0.5, fdv: "$50M" },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 1, fdv: "$100M" },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 2, fdv: "$200M" },
    ],
  },
  {
    slug: "variational",
    name: "Variational",
    description: "Calculate the estimated value of your Variational points across different price scenarios.",
    descriptionEs: "Calcula el valor estimado de tus puntos de Variational en distintos escenarios de precio.",
    logoEmoji: "📐",
    logoSrc: "/logos/variational.jpg",
    accentHex: "#8B5CF6",
    totalPointsPool: 8_400_000, // mid case: Aug TGE, 8.4M total points
    referralLink: "https://variational.io",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 50,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 10, fdv: "$100M" },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 13, fdv: "$300M" },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 16, fdv: "$500M" },
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
    totalPointsPool: 55_000_000, // confirmed: 43M current + 12M remaining (6M weeks)
    referralLink: "https://hibachi.xyz/r/lyfher",
    referralBenefit: "Sign up with my link for exclusive bonuses",
    referralBenefitEs: "Únete con mi link para bonificaciones exclusivas",
    sliderMax: 10,
    scenarios: [
      { label: "Bear", labelEs: "Bajista", emoji: "🐻", pricePerPoint: 0.27, fdv: "$100M" },
      { label: "Base", labelEs: "Normal", emoji: "📊", pricePerPoint: 0.55, fdv: "$100M" },
      { label: "Bull", labelEs: "Optimista", emoji: "🚀", pricePerPoint: 1.36, fdv: "$500M" },
    ],
  },
];
