// Team logos mapping
import logoAas from "@/assets/logos/aas.png";
import logoAdt from "@/assets/logos/adt.png";
import logoAli from "@/assets/logos/ali.png";
import logoCha from "@/assets/logos/cha.png";
import logoCie from "@/assets/logos/cie.png";
import logoCom from "@/assets/logos/com.png";
import logoCri from "@/assets/logos/cri.png";
import logoCus from "@/assets/logos/cus.png";
import logoFcc from "@/assets/logos/fcc.png";
import logoGar from "@/assets/logos/gar.png";
import logoGra from "@/assets/logos/gra.png";
import logoJpi from "@/assets/logos/jpi.png";
import logoMel from "@/assets/logos/mel.png";
import logoMoq from "@/assets/logos/moq.png";
import logoSba from "@/assets/logos/sba.png";
import logoShu from "@/assets/logos/shu.png";
import logoUni from "@/assets/logos/uni.png";
import logoUtc from "@/assets/logos/utc.png";

// Map team IDs to their logo imports
export const teamLogos: Record<string, string> = {
  aas: logoAas,
  adt: logoAdt,
  ali: logoAli,
  cha: logoCha,
  cie: logoCie,
  com: logoCom,
  cri: logoCri,
  cus: logoCus,
  fcc: logoFcc,
  gar: logoGar,
  gra: logoGra,
  jpi: logoJpi,
  mel: logoMel,
  moq: logoMoq,
  sba: logoSba,
  shu: logoShu,
  uni: logoUni,
  utc: logoUtc,
};

// Helper function to get team logo by ID
export const getTeamLogo = (teamId: string): string | null => {
  return teamLogos[teamId.toLowerCase()] || null;
};
