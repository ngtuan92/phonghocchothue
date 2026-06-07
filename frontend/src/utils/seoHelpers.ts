/**
 * Strips HTML tags, inline style/script elements, and HTML entities
 * from a string to prevent styling or markup from leaking into JSON-LD schemas.
 */
export const stripHtmlAndCss = (val: string | null | undefined): string => {
  if (!val || typeof val !== "string") return "";
  return val
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};
