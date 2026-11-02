import { randomBytes } from "node:crypto";

// "Ghatkopar Dairy" -> "ghatkopar-dairy-3f9a": readable in URLs, with a short random tail so names can repeat
export function slugId(text) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "item"}-${randomBytes(2).toString("hex")}`;
}
