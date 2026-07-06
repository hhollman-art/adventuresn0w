"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadMapImagesFromLibrary } from "@/modules/vtt";
import type { LibraryImageThumb } from "@/lib/generationLibrary";

type Options = { loadOnMount?: boolean };

/** Lazy or eager load of map/token art from the Library CMDB (result.maps scrolls). */
export function useGenerationLibraryImages(options: Options = {}) {
  const { loadOnMount = false } = options;
  const [images, setImages] = useState<LibraryImageThumb[] | null>(null);
  const loadPromise = useRef<Promise<LibraryImageThumb[]> | null>(null);

  const load = useCallback(async () => {
    if (images !== null) return images;
    if (!loadPromise.current) {
      loadPromise.current = loadMapImagesFromLibrary().then((thumbs) => {
        setImages(thumbs);
        return thumbs;
      });
    }
    return loadPromise.current;
  }, [images]);

  useEffect(() => {
    if (loadOnMount) void load();
  }, [loadOnMount, load]);

  return { images, load };
}
