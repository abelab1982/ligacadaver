interface FootballPitchProps {
  children?: React.ReactNode;
}

export const FootballPitch = ({ children }: FootballPitchProps) => {
  return (
    <div className="relative w-full aspect-[68/105] max-h-[calc(100vh-220px)] mx-auto select-none">
      {/* Pitch Background */}
      <svg
        viewBox="0 0 680 1050"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grass */}
        <rect x="0" y="0" width="680" height="1050" rx="12" fill="#1a6b30" />
        
        {/* Grass stripes */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <rect
            key={i}
            x="0"
            y={i * 105}
            width="680"
            height="105"
            fill={i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
          />
        ))}

        {/* Outer boundary */}
        <rect
          x="30" y="30" width="620" height="990"
          fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
        />

        {/* Center line */}
        <line x1="30" y1="525" x2="650" y2="525" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

        {/* Center circle */}
        <circle cx="340" cy="525" r="91.5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <circle cx="340" cy="525" r="4" fill="rgba(255,255,255,0.6)" />

        {/* Top penalty area */}
        <rect x="138" y="30" width="404" height="165" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <rect x="220" y="30" width="240" height="55" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <circle cx="340" cy="147" r="4" fill="rgba(255,255,255,0.6)" />
        <path d="M 268 195 A 91.5 91.5 0 0 0 412 195" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

        {/* Bottom penalty area */}
        <rect x="138" y="855" width="404" height="165" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <rect x="220" y="965" width="240" height="55" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <circle cx="340" cy="903" r="4" fill="rgba(255,255,255,0.6)" />
        <path d="M 268 855 A 91.5 91.5 0 0 1 412 855" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

        {/* Corner arcs */}
        <path d="M 30 42 A 12 12 0 0 0 42 30" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <path d="M 638 30 A 12 12 0 0 0 650 42" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <path d="M 30 1008 A 12 12 0 0 1 42 1020" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <path d="M 638 1020 A 12 12 0 0 1 650 1008" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      </svg>

      {/* Player tokens overlay */}
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
};
