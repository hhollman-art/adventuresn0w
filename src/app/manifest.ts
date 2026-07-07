import type { MetadataRoute } from "next";
import { APP_THEMES, DEFAULT_APP_THEME } from "@/lib/themes";

export default function manifest(): MetadataRoute.Manifest {
  const theme = APP_THEMES[DEFAULT_APP_THEME];

  return {
    name: "D&D Easy — Adventures & heroes",
    short_name: "D&D Easy",
    description:
      "Generate D&D 5.2-style adventures, pre-made heroes, and map images. Prep at the Fantasy Forge.",
    start_url: "/",
    display: "standalone",
    background_color: theme.themeColor,
    theme_color: theme.themeColor,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
