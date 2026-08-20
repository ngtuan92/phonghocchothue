export const RICH_TEXT_DELTA_MIME = "application/x-phonghoc-rich-text-delta";
const RICH_TEXT_DELTA_ATTRIBUTE = "data-phonghoc-rich-text-delta";

const HORIZONTAL_WHITESPACE_PATTERN = /[\t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/;
const HORIZONTAL_WHITESPACE_ONLY_PATTERN = /^[\t \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+$/;

export const hasSignificantHorizontalWhitespace = (value) => {
  const text = String(value || "");
  return HORIZONTAL_WHITESPACE_PATTERN.test(text) || /(^|\n) +| {2,}| +(?=\n|$)/.test(text);
};

export const preserveSignificantHorizontalWhitespace = (value) => String(value || "")
  .replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")
  .replace(/[\u1680\u2000-\u200a\u202f\u205f\u3000]/g, "\u00a0")
  .replace(/(^|\n)( +)/g, (_match, prefix, spaces) => `${prefix}${"\u00a0".repeat(spaces.length)}`)
  .replace(/ {2,}/g, (spaces) => "\u00a0".repeat(spaces.length))
  .replace(/ +(?=\n|$)/g, (spaces) => "\u00a0".repeat(spaces.length));

const horizontalIndentScore = (value) => String(value || "")
  .replace(/\r\n?/g, "\n")
  .split("\n")
  .reduce((total, line) => {
    const indent = line.match(/^[\t \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/)?.[0] || "";
    return total + Array.from(indent).reduce(
      (lineTotal, character) => lineTotal + (character === "\t" ? 4 : 1),
      0
    );
  }, 0);

export const stripHorizontalIndent = (value) => String(value || "")
  .replace(/\r\n?/g, "\n")
  .split("\n")
  .map((line) => line.replace(/^[\t \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/, ""))
  .join("\n");

export const clipboardTextMatchesIgnoringLeadingIndent = (clipboardText, copiedText) => {
  const normalizedClipboardText = String(clipboardText || "").replace(/\r\n?/g, "\n");
  const normalizedCopiedText = String(copiedText || "").replace(/\r\n?/g, "\n");
  if (normalizedClipboardText === normalizedCopiedText) return true;
  if (!normalizedClipboardText || !normalizedCopiedText) return false;

  return stripHorizontalIndent(normalizedClipboardText) === stripHorizontalIndent(normalizedCopiedText);
};

export const selectClipboardSpacingSource = (plainText, htmlText) => {
  const normalizedPlainText = String(plainText || "").replace(/\r\n?/g, "\n");
  const normalizedHtmlText = String(htmlText || "").replace(/\r\n?/g, "\n");

  if (
    normalizedHtmlText &&
    stripHorizontalIndent(normalizedHtmlText) === stripHorizontalIndent(normalizedPlainText) &&
    horizontalIndentScore(normalizedHtmlText) > horizontalIndentScore(normalizedPlainText)
  ) {
    return normalizedHtmlText;
  }

  return normalizedPlainText;
};

export const expandCopyRangeToLeadingWhitespace = (quill, range) => {
  if (!range || range.length <= 0 || range.index <= 0) return range;

  const textBeforeSelection = quill.getText(0, range.index);
  const lineStart = textBeforeSelection.lastIndexOf("\n") + 1;
  if (lineStart >= range.index) return range;

  const omittedPrefix = quill.getText(lineStart, range.index - lineStart);
  if (!HORIZONTAL_WHITESPACE_ONLY_PATTERN.test(omittedPrefix)) return range;

  return {
    index: lineStart,
    length: range.length + (range.index - lineStart),
  };
};

export const serializeRichTextDelta = (delta) => {
  if (!Array.isArray(delta?.ops)) return "";
  return JSON.stringify({ version: 1, ops: delta.ops });
};

export const embedRichTextDeltaInHtml = (html, serializedDelta) => {
  if (!serializedDelta) return String(html || "");
  const encodedDelta = encodeURIComponent(serializedDelta);
  return `<div ${RICH_TEXT_DELTA_ATTRIBUTE}="${encodedDelta}">${String(html || "")}</div>`;
};

export const extractRichTextDeltaFromHtml = (html) => {
  const source = String(html || "");
  const match = source.match(/data-phonghoc-rich-text-delta=["']([^"']+)["']/i);
  if (!match?.[1]) return "";

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
};

export const parseRichTextDelta = (serialized, Delta) => {
  if (!serialized || typeof Delta !== "function") return null;

  try {
    const parsed = JSON.parse(serialized);
    if (parsed?.version !== 1 || !Array.isArray(parsed.ops)) return null;

    const validOps = parsed.ops.every((op) => (
      op &&
      typeof op === "object" &&
      Object.prototype.hasOwnProperty.call(op, "insert") &&
      (typeof op.insert === "string" || (op.insert && typeof op.insert === "object")) &&
      (op.attributes === undefined || (op.attributes && typeof op.attributes === "object"))
    ));
    if (!validOps) return null;

    return new Delta(parsed.ops);
  } catch {
    return null;
  }
};
