import { CELL_PX } from "./gridScale";

const MAX_CANVAS_SIDE_PX = 16384;
const JPEG_QUALITY = 0.92;

/** Source rectangle for a cover crop into a target aspect ratio (center crop). */
export function coverCropRect(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (srcW <= 0 || srcH <= 0 || targetW <= 0 || targetH <= 0) {
    return { sx: 0, sy: 0, sw: srcW, sh: srcH };
  }
  const targetAspect = targetW / targetH;
  const srcAspect = srcW / srcH;
  if (srcAspect > targetAspect) {
    const sh = srcH;
    const sw = sh * targetAspect;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh };
  }
  const sw = srcW;
  const sh = sw / targetAspect;
  return { sx: 0, sy: (srcH - sh) / 2, sw, sh };
}

/**
 * Cover-crops a battle map to an exact grid aspect ratio and cell resolution so
 * each square in the art lines up with the VTT overlay grid.
 */
export function prepareMapImage(
  source: string | File,
  gridCols: number,
  gridRows: number,
): Promise<string | null> {
  const cols = Math.max(1, Math.round(gridCols));
  const rows = Math.max(1, Math.round(gridRows));
  const targetW = cols * CELL_PX;
  const targetH = rows * CELL_PX;
  if (targetW < 1 || targetH < 1 || targetW > MAX_CANVAS_SIDE_PX || targetH > MAX_CANVAS_SIDE_PX) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      const { sx, sy, sw, sh } = coverCropRect(
        img.naturalWidth,
        img.naturalHeight,
        targetW,
        targetH,
      );
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      try {
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
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

export async function readImageSource(source: string | File): Promise<string | null> {
  if (typeof source === "string") return source;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(source);
  });
}
