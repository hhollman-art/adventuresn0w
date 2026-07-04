"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadGenerationLibraryImages,
  type LibraryImageThumb,
} from "@/lib/generationLibrary";

type Options = { loadOnMount?: boolean };

/** Lazy or eager load of flattened generation-library image thumbnails. */
export function useGenerationLibraryImages(options: Options = {}) {
  const { loadOnMount = false } = options;
  const [images, setImages] = useState<LibraryImageThumb[] | null>(null);
  const loadPromise = useRef<Promise<LibraryImageThumb[]> | null>(null);

  const load = useCallback(async () => {
    if (images !== null) return images;
    if (!loadPromise.current) {
      loadPromise.current = loadGenerationLibraryImages().then((thumbs) => {
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
