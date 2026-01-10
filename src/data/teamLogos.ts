// Team logos mapping
import logoAas from "@/assets/logos/aas.png";
import logoAli from "@/assets/logos/ali.svg";
import logoCie from "@/assets/logos/cie.png";
import logoCom from "@/assets/logos/com.png";
import logoCus from "@/assets/logos/cus.png";
import logoGar from "@/assets/logos/gar.png";
import logoGra from "@/assets/logos/gra.png";
import logoSba from "@/assets/logos/sba.svg";
import logoUni from "@/assets/logos/uni.png";

// Map team IDs to their logo imports
export const teamLogos: Record<string, string> = {
  aas: logoAas,
  ali: logoAli,
  cie: logoCie,
  com: logoCom,
  cus: logoCus,
  gar: logoGar,
  gra: logoGra,
  sba: logoSba,
  uni: logoUni,
};

// Helper function to get team logo by ID
export const getTeamLogo = (teamId: string): string | null => {
  return teamLogos[teamId.toLowerCase()] || null;
};
