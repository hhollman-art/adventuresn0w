"use client";

import { useId } from "react";

type ScryingGlassIconProps = {
  /** Render size in CSS pixels (scales cleanly at 24 and 48). */
  size?: number;
  className?: string;
};

/** Magnifying glass — glassy lens with arcane blue highlights for the Scrying Glass chrome. */
export default function ScryingGlassIcon({ size = 24, className }: ScryingGlassIconProps) {
  const uid = useId().replace(/:/g, "");
  const lensId = `scrying-lens-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={lensId} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#e8f7ff" />
          <stop offset="35%" stopColor="#8ed4ff" />
          <stop offset="72%" stopColor="#3d7ab5" />
          <stop offset="100%" stopColor="#1a4068" />
        </radialGradient>
      </defs>
      <circle cx="21" cy="21" r="13" fill={`url(#${lensId})`} opacity="0.95" />
      <circle
        cx="21"
        cy="21"
        r="13"
        stroke="#b8e6ff"
        strokeWidth="1.2"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M13 14 Q16 10 22 11"
        stroke="#f0fbff"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <line
        x1="30"
        y1="30"
        x2="39"
        y2="39"
        stroke="#5a9fd8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="30"
        x2="39"
        y2="39"
        stroke="#9ed8ff"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
