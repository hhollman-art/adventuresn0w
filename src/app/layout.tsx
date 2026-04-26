import type { Metadata, Viewport } from "next";
import "./globals.css";
import pkg from "../../package.json";

export const metadata: Metadata = {
  title: "D&D Easy — Adventures & characters (5.2)",
  description:
    "Generate D&D 5.2-style adventures (short, one-nighter, or campaign), pre-made characters, and text/ASCII maps with Claude.",
};

export const viewport: Viewport = {
  themeColor: "#0f1419",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params,
}: Readonly<LayoutProps<"/">>) {
  await params;

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
