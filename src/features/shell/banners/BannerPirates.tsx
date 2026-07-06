import BannerShell from "./BannerShell";

export default function BannerPirates() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-pirate-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#183048" />
          <stop offset="100%" stopColor="#081018" />
        </linearGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-pirate-sky)" />
      <circle cx="780" cy="38" r="22" fill="#f0f0d8" opacity="0.7" />
      {/* Waves */}
      <path
        d="M0 120 Q120 108 240 120 Q360 132 480 118 Q600 104 720 120 Q840 136 960 122 L960 180 L0 180 Z"
        fill="#1a3850"
        opacity="0.85"
      />
      <path
        d="M0 138 Q160 128 320 138 Q480 148 640 132 Q800 118 960 138 L960 180 L0 180 Z"
        fill="#0c2030"
        opacity="0.9"
      />
      {/* Ship silhouette */}
      <path
        d="M280 110 L340 110 L360 88 L420 88 L440 110 L680 110 L660 98 L300 98 Z"
        fill="#2a1810"
      />
      <path d="M400 88 L408 28 L416 88" stroke="#3a2818" strokeWidth="6" fill="none" />
      <path d="M404 32 L450 55 L404 48 Z" fill="#1a1010" opacity="0.85" />
      {/* Rope and plank texture */}
      <path d="M300 110 Q480 118 680 110" stroke="#4a3828" strokeWidth="2" fill="none" opacity="0.5" />
    </BannerShell>
  );
}
