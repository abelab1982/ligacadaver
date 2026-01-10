import { getTeamLogo } from "@/data/teamLogos";

interface TeamLogoProps {
  teamId: string;
  teamName: string;
  abbreviation: string;
  primaryColor: string;
  size?: "sm" | "md" | "lg";
}

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-10 h-10", 
  lg: "w-12 h-12"
};

const textSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm"
};

export const TeamLogo = ({ 
  teamId, 
  teamName, 
  abbreviation, 
  primaryColor, 
  size = "md" 
}: TeamLogoProps) => {
  const logo = getTeamLogo(teamId);
  const sizeClass = sizeClasses[size];
  const textSize = textSizes[size];

  if (logo) {
    return (
      <div className={`${sizeClass} shrink-0 flex items-center justify-center`}>
        <img 
          src={logo} 
          alt={teamName}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClass} rounded-md flex items-center justify-center ${textSize} font-bold shrink-0 shadow-sm`}
      style={{ 
        backgroundColor: primaryColor,
        color: getContrastColor(primaryColor)
      }}
    >
      {abbreviation}
    </div>
  );
};
