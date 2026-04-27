import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import pkg from "../../package.json";

export const metadata: Metadata = {
  title: "D&D Easy — Adventures & characters (5.2)",
  description:
    "Generate D&D 5.2-style adventures (short or one-nighter), pre-made characters, and map images with Claude.",
};

export const viewport: Viewport = {
  themeColor: "#0f1419",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <p
          className="px-4 py-3 text-center text-xs text-[var(--muted)]"
          aria-label={`Application version ${pkg.version}`}
        >
          {"D&D Easy"} v{pkg.version}
        </p>
      </body>
    </html>
  );
}
