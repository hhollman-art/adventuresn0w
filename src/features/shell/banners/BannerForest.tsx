import BannerShell from "./BannerShell";

export default function BannerForest() {
  return (
    <BannerShell>
      <defs>
        <linearGradient id="bn-forest-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3420" />
          <stop offset="100%" stopColor="#0a1208" />
        </linearGradient>
        <radialGradient id="bn-forest-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0f4d8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a8c878" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="180" fill="url(#bn-forest-sky)" />
      <circle cx="720" cy="42" r="26" fill="url(#bn-forest-moon)" />
      <path
        d="M0 95 Q240 54 480 82 Q720 108 960 80 L960 180 L0 180 Z"
        fill="#142010"
        opacity="0.92"
      />
      <path d="M0 48 Q120 8 240 42" stroke="#1a2814" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M960 44 Q840 4 720 38" stroke="#1a2814" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="28" rx="20" ry="12" fill="#4a7a38" transform="rotate(-22 32 28)" opacity="0.9" />
      <ellipse cx="928" cy="24" rx="22" ry="13" fill="#3d5c2e" transform="rotate(18 928 24)" opacity="0.9" />
      <circle cx="320" cy="52" r="1.8" fill="#ffe8a0" opacity="0.75" />
      <circle cx="580" cy="64" r="1.4" fill="#ffe8a0" opacity="0.6" />
      <path
        d="M0 148 Q480 158 960 146 L960 180 L0 180 Z"
        fill="#0e160c"
        opacity="0.85"
      />
    </BannerShell>
  );
}
