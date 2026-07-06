import BannerShell from "./BannerShell";

export default function BannerIceTower() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-ice-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#284860" />
          <stop offset="100%" stopColor="#101820" />
        </linearGradient>
        <linearGradient id="bn-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#68c8e8" stopOpacity="0" />
          <stop offset="50%" stopColor="#a8e8ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8868d8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-ice-sky)" />
      <rect x="0" y="20" width="960" height="40" fill="url(#bn-aurora)" />
      {/* Ice spire */}
      <path d="M480 8 L420 148 L540 148 Z" fill="#c8e8f8" opacity="0.85" />
      <path d="M480 8 L450 148 L510 148 Z" fill="#e8f8ff" opacity="0.55" />
      <path d="M480 30 L465 148 L495 148 Z" fill="#ffffff" opacity="0.25" />
      {/* Floating sigils */}
      <circle cx="320" cy="60" r="14" fill="none" stroke="#a8e8ff" strokeWidth="1.5" opacity="0.5" />
      <circle cx="640" cy="72" r="10" fill="none" stroke="#c8a8ff" strokeWidth="1.2" opacity="0.45" />
      {/* Snow drift */}
      <path
        d="M0 140 Q240 128 480 138 Q720 148 960 132 L960 180 L0 180 Z"
        fill="#d8eef8"
        opacity="0.55"
      />
      <path
        d="M0 155 Q480 148 960 158 L960 180 L0 180 Z"
        fill="#a8c8d8"
        opacity="0.35"
      />
    </BannerShell>
  );
}
