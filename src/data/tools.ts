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
  calculatorSlug?: string; // links to /{slug} calculator page
}

export const tools: Tool[] = [];
