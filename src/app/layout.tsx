import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cinzel } from "next/font/google";
import SiteTitleBar from "@/features/shell/SiteTitleBar";
import AppChrome from "@/features/shell/AppChrome";
import { APP_THEME_ORDER, APP_THEMES, DEFAULT_APP_THEME } from "@/lib/themes";
import "./globals.css";
import pkg from "../../package.json";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const themeColors = Object.fromEntries(
  Object.entries(APP_THEMES).map(([id, theme]) => [id, theme.themeColor]),
) as Record<string, string>;

const themeBootScript = `(function(){try{var k="ddeasy-app-theme",v=localStorage.getItem(k),valid=${JSON.stringify(APP_THEME_ORDER)};var colors=${JSON.stringify(themeColors)};if(v&&valid.indexOf(v)!==-1){document.documentElement.dataset.theme=v;var m=document.querySelector('meta[name="theme-color"]');if(m&&colors[v])m.setAttribute("content",colors[v])}var p=location.pathname;if(p==="/preview"){document.documentElement.dataset.previewWindow="standalone"}else if(p!=="/"&&!p.startsWith("/library")){document.documentElement.dataset.forgeBanner="compact"}else{document.documentElement.dataset.forgeBanner="welcome"}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "D&D Easy — Adventures & heroes (5.2)",
  description:
    "Generate D&D 5.2-style adventures (short or one-nighter), pre-made heroes, and map images with Claude.",
};

export const viewport: Viewport = {
  themeColor: APP_THEMES[DEFAULT_APP_THEME].themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cinzel.variable} data-theme={DEFAULT_APP_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="app-shell flex min-h-dvh flex-col antialiased">
        <SiteTitleBar />
        <AppChrome>
          <div className="app-content">{children}</div>
        </AppChrome>
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
