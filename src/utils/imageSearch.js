/**
 * Turns an uploaded photo into a search term. There is no image-recognition
 * backend, so we match words in the file name (e.g. "banana_bunch.jpg")
 * against the catalog and fall back to the cleaned-up file name itself.
 */
export function searchTermFromImage(file, products) {
  const words = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !["img", "image", "photo", "pic", "screenshot", "whatsapp", "jpeg"].includes(w));

  const match = words.find((word) =>
    products.some((p) => p.name.toLowerCase().includes(word) || p.category.toLowerCase().includes(word))
  );
  return match || words.join(" ");
}
