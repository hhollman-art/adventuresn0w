import BannerShell from "./BannerShell";

export default function BannerHades() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-hades-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#281810" />
          <stop offset="100%" stopColor="#100804" />
        </linearGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-hades-sky)" />
      {/* Obsidian peaks */}
      <path d="M0 100 L120 40 L200 100 Z" fill="#181010" opacity="0.9" />
      <path d="M760 95 L860 35 L960 95 Z" fill="#141010" opacity="0.9" />
      {/* River of fire */}
      <path
        d="M0 130 Q240 118 480 128 Q720 138 960 122 L960 180 L0 180 Z"
        fill="#8a2810"
        opacity="0.75"
      />
      <path
        d="M0 142 Q480 132 960 144 L960 180 L0 180 Z"
        fill="#c84818"
        opacity="0.55"
      />
      <ellipse cx="240" cy="136" rx="60" ry="8" fill="#ffb060" opacity="0.35" />
      <ellipse cx="680" cy="138" rx="70" ry="9" fill="#ff9040" opacity="0.3" />
      {/* Ash particles */}
      <circle cx="180" cy="60" r="1.5" fill="#888" opacity="0.4" />
      <circle cx="420" cy="48" r="1.2" fill="#aaa" opacity="0.35" />
      <circle cx="720" cy="55" r="1.4" fill="#888" opacity="0.4" />
      {/* Dead trees */}
      <path d="M520 100 L524 55 M524 55 Q540 45 548 55" stroke="#201810" strokeWidth="3" fill="none" />
    </BannerShell>
  );
}
