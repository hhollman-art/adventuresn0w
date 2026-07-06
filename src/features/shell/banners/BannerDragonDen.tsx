import BannerShell from "./BannerShell";

export default function BannerDragonDen() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-dragon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1830" />
          <stop offset="100%" stopColor="#061018" />
        </linearGradient>
        <radialGradient id="bn-dragon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#48c8f0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#184868" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-dragon-sky)" />
      <ellipse cx="480" cy="90" rx="220" ry="70" fill="url(#bn-dragon-glow)" />
      {/* Cave walls */}
      <path d="M0 0 L0 180 L120 180 Q80 90 0 40 Z" fill="#081018" opacity="0.9" />
      <path d="M960 0 L960 180 L840 180 Q880 90 960 40 Z" fill="#081018" opacity="0.9" />
      {/* Crystal clusters */}
      <path d="M140 120 L155 70 L170 120 Z" fill="#68d8ff" opacity="0.75" />
      <path d="M820 115 L838 65 L856 115 Z" fill="#88e8ff" opacity="0.7" />
      <path d="M760 130 L772 95 L784 130 Z" fill="#48b8e8" opacity="0.65" />
      {/* Dragon silhouette */}
      <path
        d="M380 95 Q420 55 480 68 Q540 82 560 55 Q590 38 620 62 Q650 88 680 72 L700 95 Q660 110 620 98 Q560 88 500 102 Q440 112 380 95 Z"
        fill="#0c2038"
        opacity="0.85"
      />
      <circle cx="598" cy="68" r="4" fill="#88e8ff" opacity="0.9" />
      {/* Coin hoard */}
      <ellipse cx="480" cy="148" rx="120" ry="14" fill="#c9a227" opacity="0.35" />
      <ellipse cx="450" cy="142" rx="18" ry="5" fill="#e8c868" opacity="0.55" />
      <ellipse cx="510" cy="140" rx="22" ry="6" fill="#d4b040" opacity="0.5" />
      {/* Lightning crack */}
      <path
        d="M480 20 L470 55 L485 55 L475 90"
        stroke="#a8f0ff"
        strokeWidth="2"
        fill="none"
        opacity="0.55"
      />
    </BannerShell>
  );
}
