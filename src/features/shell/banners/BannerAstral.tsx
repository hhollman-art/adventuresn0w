import BannerShell from "./BannerShell";

export default function BannerAstral() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-astral-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#180820" />
          <stop offset="100%" stopColor="#080410" />
        </linearGradient>
        <radialGradient id="bn-nebula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8868c8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#284868" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-astral-sky)" />
      <ellipse cx="480" cy="80" rx="280" ry="90" fill="url(#bn-nebula)" />
      {/* Stars */}
      {[
        [80, 30],
        [160, 55],
        [280, 22],
        [640, 38],
        [820, 52],
        [900, 28],
        [380, 42],
        [560, 18],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" fill="#f0f0ff" opacity="0.75" />
      ))}
      {/* Floating island */}
      <ellipse cx="480" cy="118" rx="100" ry="18" fill="#484868" opacity="0.85" />
      <path
        d="M400 118 Q480 88 560 118"
        fill="#585878"
        opacity="0.75"
      />
      {/* Silver river ribbon */}
      <path
        d="M0 90 Q240 70 480 82 Q720 94 960 78"
        stroke="#c8d0e8"
        strokeWidth="1.5"
        fill="none"
        opacity="0.35"
      />
      <path
        d="M0 100 Q480 88 960 98"
        stroke="#a8b0d0"
        strokeWidth="1"
        fill="none"
        opacity="0.25"
      />
    </BannerShell>
  );
}
