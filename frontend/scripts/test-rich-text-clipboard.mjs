import assert from "node:assert/strict";
import test from "node:test";

import {
  clipboardTextMatchesIgnoringLeadingIndent,
  embedRichTextDeltaInHtml,
  expandCopyRangeToLeadingWhitespace,
  extractRichTextDeltaFromHtml,
  parseRichTextDelta,
  preserveSignificantHorizontalWhitespace,
  selectClipboardSpacingSource,
  serializeRichTextDelta,
} from "../src/utils/richTextClipboard.mjs";

class TestDelta {
  constructor(ops = []) {
    this.ops = ops;
  }
}

test("Delta round trip preserves whitespace, lines, and formatting", () => {
  const source = new TestDelta([
    { insert: "\u00a0\u00a0Đề bài: ", attributes: { bold: true } },
    { insert: "\tGiá trị nghệ thuật\n", attributes: { italic: true, font: "thuong-chan" } },
  ]);
  const restored = parseRichTextDelta(serializeRichTextDelta(source), TestDelta);
  assert.deepEqual(restored?.ops, source.ops);
});

test("HTML clipboard fallback carries the exact Delta when custom MIME is stripped", () => {
  const source = new TestDelta([
    { insert: "\t\t\u00a0\u00a0Điều gì tạo", attributes: { font: "thuong-chan" } },
  ]);
  const serialized = serializeRichTextDelta(source);
  const clipboardHtml = embedRichTextDeltaInHtml("<p>Điều gì tạo</p>", serialized);

  assert.equal(extractRichTextDeltaFromHtml(clipboardHtml), serialized);
  assert.deepEqual(parseRichTextDelta(extractRichTextDeltaFromHtml(clipboardHtml), TestDelta)?.ops, source.ops);
});

test("malformed Delta clipboard payload is ignored", () => {
  assert.equal(parseRichTextDelta("not-json", TestDelta), null);
  assert.equal(parseRichTextDelta('{"version":1,"ops":[{"retain":2}]}', TestDelta), null);
});

test("copy includes indentation immediately before selected text", () => {
  const text = "\n\t  Nội dung";
  const quill = { getText: (index, length) => text.slice(index, index + length) };
  assert.deepEqual(
    expandCopyRangeToLeadingWhitespace(quill, { index: 4, length: 8 }),
    { index: 1, length: 11 }
  );
});

test("copy never expands across non-whitespace text", () => {
  const text = "Đề bài: Nội dung";
  const quill = { getText: (index, length) => text.slice(index, index + length) };
  const range = { index: 8, length: 8 };
  assert.deepEqual(expandCopyRangeToLeadingWhitespace(quill, range), range);
});

test("tabs and repeated leading spaces remain visible", () => {
  assert.equal(
    preserveSignificantHorizontalWhitespace("\tDòng 1\n   Dòng 2"),
    "\u00a0\u00a0\u00a0\u00a0Dòng 1\n\u00a0\u00a0\u00a0Dòng 2"
  );
});

test("HTML indentation is used only when clipboard line content matches", () => {
  assert.equal(
    selectClipboardSpacingSource("Dòng 1\nDòng 2", "  Dòng 1\n    Dòng 2"),
    "  Dòng 1\n    Dòng 2"
  );
  assert.equal(
    selectClipboardSpacingSource("Một đoạn\nĐầy đủ", "Một đoạn rời\n  Một đoạn\nĐầy đủ"),
    "Một đoạn\nĐầy đủ"
  );
});

test("recent internal copy still matches when clipboard text loses indentation", () => {
  assert.equal(
    clipboardTextMatchesIgnoringLeadingIndent(
      "Dieu gi tao nen gia tri",
      "\t\u00a0\u00a0Dieu gi tao nen gia tri"
    ),
    true
  );
  assert.equal(
    clipboardTextMatchesIgnoringLeadingIndent(
      "Bai Lam:\nDieu gi tao nen gia tri",
      "Bai Lam:\n    Dieu gi tao nen gia tri"
    ),
    true
  );
  assert.equal(
    clipboardTextMatchesIgnoringLeadingIndent(
      "Dieu gi tao nen gia tri khac",
      "    Dieu gi tao nen gia tri"
    ),
    false
  );
});
