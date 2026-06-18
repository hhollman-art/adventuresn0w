import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cinzel } from "next/font/google";
import "./globals.css";
import pkg from "../../package.json";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "D&D Easy — Adventures & characters (5.2)",
  description:
    "Generate D&D 5.2-style adventures (short or one-nighter), pre-made characters, and map images with Claude.",
};

export const viewport: Viewport = {
  themeColor: "#f0e6cf",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body className="min-h-screen antialiased">
        <header className="site-banner no-print">
          <div className="site-banner-inner">
            <nav className="site-banner-nav">
              <Link href="/help" className="site-help-link">
                <span className="site-help-link-icon" aria-hidden="true">
                  &#128214;
                </span>
                How to use
              </Link>
            </nav>
            <div className="site-banner-brand">
              <Link href="/" className="inline-block">
                <span className="font-display site-banner-title block text-2xl font-bold sm:text-3xl">
                  <span aria-hidden="true">&#9876;&#65039; </span>
                  D&amp;D Easy
                  <span aria-hidden="true"> &#9876;&#65039;</span>
                </span>
              </Link>
              <p className="mt-1 text-xs tracking-[0.2em] text-[var(--muted)] uppercase">
                Forge realms &middot; Weave adventures &middot; Summon heroes
              </p>
            </div>
          </div>
        </header>
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
