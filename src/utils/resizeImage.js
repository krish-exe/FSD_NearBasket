const MAX_SIDE = 800;

/**
 * Shrinks a photo so its longest side is at most 800px and re-saves it as WebP
 * (or JPEG where the browser can't write WebP). A phone photo of several MB
 * usually ends up around 50-150 KB, well under the server's 1 MB limit.
 */
export async function resizeImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo file (JPG, PNG or WebP).");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That photo couldn't be read. Try a JPG or PNG.");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await toBlob("image/webp");
  // Browsers that can't write WebP hand back a PNG instead
  return webp?.type === "image/webp" ? webp : toBlob("image/jpeg");
}
