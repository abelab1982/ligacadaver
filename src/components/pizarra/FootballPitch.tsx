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
        {/* Dark premium base */}
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d3320" />
            <stop offset="50%" stopColor="#145a32" />
            <stop offset="100%" stopColor="#0d3320" />
          </linearGradient>
          {/* Subtle grass texture stripes */}
          <pattern id="grassStripes" patternUnits="userSpaceOnUse" width="680" height="105">
            <rect width="680" height="52.5" fill="rgba(255,255,255,0.015)" />
            <rect y="52.5" width="680" height="52.5" fill="rgba(0,0,0,0.015)" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="680" height="1050" rx="12" fill="url(#pitchGrad)" />
        <rect x="0" y="0" width="680" height="1050" rx="12" fill="url(#grassStripes)" />

        {/* Lines - bright white with glow effect */}
        <g stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none">
          {/* Outer boundary */}
          <rect x="30" y="30" width="620" height="990" />

          {/* Center line */}
          <line x1="30" y1="525" x2="650" y2="525" />

          {/* Center circle */}
          <circle cx="340" cy="525" r="91.5" />
          <circle cx="340" cy="525" r="4" fill="rgba(255,255,255,0.75)" />

          {/* Top penalty area */}
          <rect x="138" y="30" width="404" height="165" />
          <rect x="220" y="30" width="240" height="55" />
          <circle cx="340" cy="147" r="4" fill="rgba(255,255,255,0.75)" />
          <path d="M 268 195 A 91.5 91.5 0 0 0 412 195" />

          {/* Bottom penalty area */}
          <rect x="138" y="855" width="404" height="165" />
          <rect x="220" y="965" width="240" height="55" />
          <circle cx="340" cy="903" r="4" fill="rgba(255,255,255,0.75)" />
          <path d="M 268 855 A 91.5 91.5 0 0 1 412 855" />

          {/* Corner arcs */}
          <path d="M 30 42 A 12 12 0 0 0 42 30" />
          <path d="M 638 30 A 12 12 0 0 0 650 42" />
          <path d="M 30 1008 A 12 12 0 0 1 42 1020" />
          <path d="M 638 1020 A 12 12 0 0 1 650 1008" />
        </g>

        {/* Goal areas glow */}
        <rect x="270" y="20" width="140" height="12" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="270" y="1018" width="140" height="12" rx="2" fill="rgba(255,255,255,0.08)" />
      </svg>

      {/* Player tokens overlay */}
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
};
