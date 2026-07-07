import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / bookmark tile — matches the gold four-pointed star emblem in the title bar. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="forge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5c4228" />
            <stop offset="55%" stopColor="#3d2a18" />
            <stop offset="100%" stopColor="#24160c" />
          </linearGradient>
          <linearGradient id="star-gold" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#fff2c4" />
            <stop offset="45%" stopColor="#e8c56a" />
            <stop offset="100%" stopColor="#b8862b" />
          </linearGradient>
        </defs>
        <rect width="180" height="180" rx="40" fill="url(#forge-bg)" />
        <rect
          x="7"
          y="7"
          width="166"
          height="166"
          rx="34"
          fill="none"
          stroke="#d4a84b"
          strokeWidth="3"
          opacity="0.55"
        />
        <path
          d="M90 36 102.1 80.7 147 90 102.1 99.3 90 144 77.9 99.3 33 90 77.9 80.7Z"
          fill="url(#star-gold)"
        />
        <path
          d="M90 46 99.9 79.3 132 90 99.9 100.7 90 134 80.1 100.7 48 90 80.1 79.3Z"
          fill="#fff8e8"
          opacity="0.22"
        />
      </svg>
    ),
    { ...size },
  );
}
