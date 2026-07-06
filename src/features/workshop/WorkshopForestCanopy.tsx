/** Enchanted forest canopy — SVG vignette for Forge panels (no external assets). */
export default function WorkshopForestCanopy() {
  return (
    <div className="forge-forest-canopy" aria-hidden="true">
      <svg viewBox="0 0 480 96" className="forge-forest-canopy-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ff-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2e14" />
            <stop offset="55%" stopColor="#0f1a0c" />
            <stop offset="100%" stopColor="#0a1208" />
          </linearGradient>
          <linearGradient id="ff-moon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8f0c8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a8c878" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ff-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c3d22" />
            <stop offset="100%" stopColor="#3d2814" />
          </linearGradient>
          <linearGradient id="ff-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a7a38" />
            <stop offset="100%" stopColor="#2d4a22" />
          </linearGradient>
          <filter id="ff-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="480" height="96" fill="url(#ff-sky)" />

        {/* Moonlit haze through the canopy */}
        <ellipse cx="360" cy="18" rx="70" ry="28" fill="url(#ff-moon)" />
        <ellipse cx="120" cy="32" rx="55" ry="22" fill="rgba(180, 220, 120, 0.08)" />

        {/* Distant tree line */}
        <path
          d="M0 52 Q40 38 80 48 Q120 58 160 44 Q200 32 240 46 Q280 58 320 42 Q360 30 400 44 Q440 56 480 48 L480 96 L0 96 Z"
          fill="#142010"
          opacity="0.9"
        />

        {/* Mid-layer trunks */}
        <rect x="28" y="36" width="7" height="42" rx="2" fill="#2a1810" opacity="0.85" />
        <rect x="108" y="32" width="9" height="46" rx="2" fill="#241610" opacity="0.9" />
        <rect x="198" y="38" width="8" height="40" rx="2" fill="#2a1810" opacity="0.85" />
        <rect x="292" y="34" width="10" height="44" rx="2" fill="#241610" />
        <rect x="388" y="36" width="8" height="42" rx="2" fill="#2a1810" opacity="0.88" />
        <rect x="438" y="40" width="7" height="38" rx="2" fill="#241610" opacity="0.85" />

        {/* Branch arches — left */}
        <path
          d="M0 58 Q30 28 72 52 Q58 44 48 62"
          stroke="#1e3018"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M8 64 Q42 36 88 58"
          stroke="#2d4a22"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Branch arches — right */}
        <path
          d="M480 54 Q450 24 408 48 Q422 40 432 58"
          stroke="#1e3018"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M472 60 Q438 32 392 54"
          stroke="#2d4a22"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Foreground leaves — clusters */}
        <g fill="url(#ff-leaf)" filter="url(#ff-soft-glow)">
          <ellipse cx="18" cy="22" rx="14" ry="9" transform="rotate(-25 18 22)" opacity="0.92" />
          <ellipse cx="34" cy="16" rx="11" ry="7" transform="rotate(15 34 16)" opacity="0.85" />
          <ellipse cx="52" cy="24" rx="13" ry="8" transform="rotate(-8 52 24)" opacity="0.9" />
          <ellipse cx="448" cy="20" rx="15" ry="9" transform="rotate(20 448 20)" opacity="0.92" />
          <ellipse cx="430" cy="14" rx="12" ry="7" transform="rotate(-12 430 14)" opacity="0.88" />
          <ellipse cx="412" cy="26" rx="14" ry="8" transform="rotate(8 412 26)" opacity="0.9" />
          <ellipse cx="228" cy="8" rx="18" ry="10" transform="rotate(-5 228 8)" opacity="0.75" />
          <ellipse cx="252" cy="12" rx="14" ry="8" transform="rotate(10 252 12)" opacity="0.7" />
        </g>

        {/* Hanging vines */}
        <path
          d="M64 0 Q66 28 62 52 M66 4 Q70 32 64 58"
          stroke="#3d5c2e"
          strokeWidth="1.2"
          fill="none"
          opacity="0.65"
        />
        <path
          d="M416 0 Q414 26 418 50 M412 6 Q408 34 414 56"
          stroke="#3d5c2e"
          strokeWidth="1.2"
          fill="none"
          opacity="0.65"
        />

        {/* Firefly specks */}
        <circle cx="160" cy="28" r="1.2" fill="#ffe8a0" opacity="0.7" />
        <circle cx="320" cy="36" r="1" fill="#ffe8a0" opacity="0.55" />
        <circle cx="240" cy="44" r="0.9" fill="#c8e878" opacity="0.5" />
        <circle cx="88" cy="40" r="0.8" fill="#ffe8a0" opacity="0.45" />

        {/* Mossy wood rail — frames the panel below */}
        <rect x="0" y="78" width="480" height="10" fill="url(#ff-wood)" />
        <rect x="0" y="78" width="480" height="3" fill="rgba(255, 230, 180, 0.12)" />
        <path
          d="M0 88 Q60 84 120 88 Q180 92 240 88 Q300 84 360 88 Q420 92 480 88"
          stroke="#2a1810"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
        {/* Moss on rail */}
        <ellipse cx="40" cy="86" rx="12" ry="4" fill="#3d5c2e" opacity="0.55" />
        <ellipse cx="200" cy="87" rx="16" ry="4" fill="#4a6a32" opacity="0.5" />
        <ellipse cx="380" cy="86" rx="14" ry="4" fill="#3d5c2e" opacity="0.55" />
      </svg>
    </div>
  );
}
