/** Normalize a heading or title into a stable lookup slug. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function prefixedSlug(prefix: string, title: string): string {
  const base = slugify(title);
  return base.startsWith(`${prefix}-`) ? base : `${prefix}-${base}`;
}
