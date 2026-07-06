import BannerShell from "./BannerShell";

export default function BannerPaladinCitadel() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-paladin-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6888b8" />
          <stop offset="55%" stopColor="#3a5078" />
          <stop offset="100%" stopColor="#283048" />
        </linearGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-paladin-sky)" />
      {/* Sun rays */}
      <ellipse cx="480" cy="-20" rx="200" ry="80" fill="rgba(255,240,180,0.25)" />
      {/* Castle towers */}
      <rect x="320" y="48" width="48" height="100" fill="#d8dce8" />
      <rect x="592" y="48" width="48" height="100" fill="#d0d4e0" />
      <rect x="400" y="32" width="160" height="116" fill="#e8ecf4" />
      <rect x="448" y="16" width="64" height="132" fill="#f0f4fc" />
      {/* Battlements */}
      {[320, 336, 592, 608, 400, 424, 448, 472, 496, 520].map((x, i) => (
        <rect key={i} x={x} y={i < 2 ? 40 : i < 4 ? 24 : 8} width="16" height="12" fill="#c8ccd8" />
      ))}
      {/* Pennants */}
      <path d="M368 48 L368 20 L392 34 Z" fill="#2860a8" />
      <path d="M592 48 L592 20 L616 34 Z" fill="#c82828" />
      {/* Wall base */}
      <rect x="280" y="148" width="400" height="32" fill="#8890a0" />
      <path
        d="M0 165 Q480 155 960 165 L960 180 L0 180 Z"
        fill="#687080"
        opacity="0.85"
      />
    </BannerShell>
  );
}
