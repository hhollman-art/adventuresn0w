import BannerShell from "./BannerShell";

export default function BannerThievesGuild() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-thieves-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#181018" />
          <stop offset="100%" stopColor="#0c080c" />
        </linearGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-thieves-sky)" />
      {/* Brick alley walls */}
      <rect x="0" y="0" width="140" height="180" fill="#241818" opacity="0.92" />
      <rect x="820" y="0" width="140" height="180" fill="#201414" opacity="0.92" />
      {[20, 44, 68, 92, 116].map((y) => (
        <rect key={`l${y}`} x="8" y={y} width="124" height="10" rx="1" fill="#301c1c" opacity="0.55" />
      ))}
      {[16, 40, 64, 88, 112].map((y) => (
        <rect key={`r${y}`} x="828" y={y} width="124" height="10" rx="1" fill="#2a1818" opacity="0.55" />
      ))}
      {/* Lantern glow */}
      <ellipse cx="480" cy="72" rx="90" ry="40" fill="rgba(255,180,80,0.12)" />
      <circle cx="480" cy="58" r="10" fill="#ffb347" opacity="0.85" />
      <rect x="476" y="66" width="8" height="14" rx="1" fill="#4a3020" />
      {/* Hooded figure silhouette */}
      <ellipse cx="480" cy="108" rx="22" ry="26" fill="#0a0808" />
      <path d="M458 108 Q480 78 502 108" fill="#0a0808" />
      {/* Rooftop line */}
      <path d="M140 48 L480 28 L820 48" stroke="#120c10" strokeWidth="4" fill="none" />
      <path
        d="M0 155 Q480 145 960 155 L960 180 L0 180 Z"
        fill="#100808"
        opacity="0.8"
      />
    </BannerShell>
  );
}
