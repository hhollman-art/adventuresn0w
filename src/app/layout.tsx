import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cinzel } from "next/font/google";
import SiteTitleBar from "@/features/shell/SiteTitleBar";
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
      <body className="app-shell flex min-h-dvh flex-col antialiased">
        <SiteTitleBar />
        <div className="app-content">{children}</div>
        <p
          className="site-footnote shrink-0 px-4 py-3 text-center text-xs text-[var(--muted)]"
          aria-label={`Application version ${pkg.version}`}
        >
          {"D&D Easy"} v{pkg.version}
          {" · "}
          <Link href="/legal" className="underline hover:text-[var(--text)]">
            Licenses &amp; content
          </Link>
        </p>
      </body>
    </html>
  );
}
