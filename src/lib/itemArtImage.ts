import { parseDataUrl } from "@/lib/parseDataUrl";

/** Soft cap so Library snapshots stay portable across devices. */
export const MAX_ITEM_ART_DATA_URL_CHARS = 450_000;
const MAX_SIDE_PX = 768;
const JPEG_QUALITY = 0.84;

/**
 * Read a local image file into a resized JPEG/PNG data URL suitable for
 * SavedGameItem.imageDataUrl. Rejects non-images and oversized results.
 */
export async function prepareItemArtDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a PNG or JPG picture for this artifact.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Keep artwork under 8 MB — try a smaller picture.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_SIDE_PX);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare that image in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const preferPng = file.type === "image/png" && file.size < 400_000;
    const dataUrl = preferPng
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    const parsed = parseDataUrl(dataUrl);
    if (!parsed || !parsed.mediaType.startsWith("image/")) {
      throw new Error("Could not read the prepared image.");
    }
    if (dataUrl.length > MAX_ITEM_ART_DATA_URL_CHARS) {
      throw new Error(
        "That picture is still too large after shrinking. Try a simpler image.",
      );
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 1, height: 1 };
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not open that image file."));
    img.src = src;
  });
}
