import type { AppThemeId } from "@/lib/themes/types";

type BannerThemedProps = {
  themeId: AppThemeId;
};

/** Lightweight SVG banner backdrops — no external assets required. */
export default function BannerThemed({ themeId }: BannerThemedProps) {
  switch (themeId) {
    case "wanderers-journal":
      return (
        <svg
          className="site-title-bar-scene-svg"
          viewBox="0 0 960 180"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="wj-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#faf4e4" />
              <stop offset="100%" stopColor="#e8dcc4" />
            </linearGradient>
          </defs>
          <rect width="960" height="180" fill="url(#wj-sky)" />
          <path
            d="M0 130 Q240 110 480 130 T960 130"
            fill="none"
            stroke="#8b2635"
            strokeOpacity="0.12"
            strokeWidth="2"
          />
          <rect x="720" y="48" width="120" height="80" rx="4" fill="#d4c4a0" fillOpacity="0.35" />
          <path d="M720 48 h120" stroke="#b8860b" strokeOpacity="0.35" strokeWidth="3" />
        </svg>
      );
    case "iron-tome":
      return (
        <svg
          className="site-title-bar-scene-svg"
          viewBox="0 0 960 180"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="it-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a2218" />
              <stop offset="100%" stopColor="#1a1410" />
            </linearGradient>
            <radialGradient id="it-glow" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#7a2828" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1a1410" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="960" height="180" fill="url(#it-sky)" />
          <rect width="960" height="180" fill="url(#it-glow)" />
          <rect x="380" y="30" width="200" height="120" rx="6" fill="#120e0a" stroke="#c9a227" strokeOpacity="0.35" strokeWidth="2" />
          <path d="M380 50 h200 M380 70 h200 M380 90 h200" stroke="#c9a227" strokeOpacity="0.15" />
        </svg>
      );
    case "arcane-library":
      return (
        <svg
          className="site-title-bar-scene-svg"
          viewBox="0 0 960 180"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="al-sky" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a2240" />
              <stop offset="100%" stopColor="#0e1220" />
            </linearGradient>
          </defs>
          <rect width="960" height="180" fill="url(#al-sky)" />
          <circle cx="480" cy="90" r="40" fill="none" stroke="#8ec8ff" strokeOpacity="0.25" strokeWidth="1.5" />
          <circle cx="480" cy="90" r="24" fill="none" stroke="#a78bfa" strokeOpacity="0.35" strokeWidth="1" />
          <path d="M480 50 v80 M440 90 h80 M456 66 l48 48 M456 114 l48-48" stroke="#8ec8ff" strokeOpacity="0.2" />
        </svg>
      );
    case "royal-keep":
    default:
      return (
        <svg
          className="site-title-bar-scene-svg"
          viewBox="0 0 960 180"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="rk-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a3228" />
              <stop offset="100%" stopColor="#1c1814" />
            </linearGradient>
          </defs>
          <rect width="960" height="180" fill="url(#rk-sky)" />
          <path d="M320 120 V70 L360 45 L400 70 V120 M560 120 V75 L600 50 L640 75 V120" fill="#ffffff" fillOpacity="0.06" stroke="#d4a056" strokeOpacity="0.25" />
          <path d="M280 120 H680" stroke="#d4a056" strokeOpacity="0.2" strokeWidth="3" />
          <rect x="450" y="55" width="60" height="40" fill="#8b4518" fillOpacity="0.25" />
        </svg>
      );
  }
}
