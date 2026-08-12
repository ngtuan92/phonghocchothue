const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  "kien-thuc": "Kiến thức",
  "kinh-nghiem": "Kinh nghiệm",
  "van-hoc": "Văn học",
};

export function getBlogCategoryLabel(category: string): string {
  if (!category) return "";

  let decoded = category;
  try {
    decoded = decodeURIComponent(category);
  } catch {
    // Keep the original database value when it is not URI encoded.
  }

  const key = decoded
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "-");

  if (LEGACY_CATEGORY_LABELS[key]) return LEGACY_CATEGORY_LABELS[key];

  return decoded.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}
