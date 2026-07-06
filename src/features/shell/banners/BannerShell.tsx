import type { ReactNode } from "react";

/** Shared wrapper for hero banner SVG scenes. */
export default function BannerShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-title-bar-scene" aria-hidden="true">
      <svg
        viewBox="0 0 960 180"
        className="site-title-bar-scene-svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {children}
      </svg>
    </div>
  );
}
