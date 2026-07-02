const TOKEN_IMAGE_PX = 256;

/**
 * Center-crops an image to a square and downscales it for use as token art.
 * Full-size map/portrait data URLs are far too large to store per token —
 * sessions are persisted to IndexedDB and broadcast to player views ~10×/s.
 */
export function prepareTokenImage(source: string | File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (side === 0) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = TOKEN_IMAGE_PX;
      canvas.height = TOKEN_IMAGE_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        TOKEN_IMAGE_PX,
        TOKEN_IMAGE_PX,
      );
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    if (typeof source === "string") {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}
