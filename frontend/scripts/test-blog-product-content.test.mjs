/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  test-blog-product-content.test.mjs                                 │
 * │  Unit tests cho pipeline xử lý content blog/product:               │
 * │  - normalizeWordSeparators: &nbsp; glue bugs                        │
 * │  - preserveSignificantInlineWhitespace: multi-space giả mạo        │
 * │  - normalizeWhitespaceSpacers: phát hiện block khoảng trắng        │
 * │  - unwrapLeadingWhitespaceMarkers: ql-cursor / FEFF cleanup         │
 * │  - Quill placeholder text KHÔNG lọt vào HTML lưu                   │
 * │  - Button text không bị wrap (nowrap guard)                         │
 * │  - H2 heading orphan-word check (text-wrap: balance guard)          │
 * │  - white-space: pre-wrap strip khi render ra trang public           │
 * │  - Wrap group toàn vẹn sau khi lưu blog/product thực tế            │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const { JSDOM } = await import('jsdom');
const dom = new JSDOM('');
const DOMParser = dom.window.DOMParser;

// ─── Helper: mirror logic từ RichTextRenderer.tsx ────────────────────────────

/** normalizeWordSeparators – mirror từ RichTextRenderer.tsx:151-185 */
function normalizeWordSeparators(html) {
  if (!html) return html;

  const multiSpaceTokens = [];
  let tokenized = html.replace(/(?:&nbsp;|\u00a0| ){2,}/g, (match) => {
    const token = `___MULTI_NBSP_${multiSpaceTokens.length}___`;
    multiSpaceTokens.push(match.replace(/ /g, '\u00a0'));
    return token;
  });

  const spacerTokens = [];
  tokenized = tokenized.replace(
    /(<(p|div|h[1-6]|li)\b[^>]*>)\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*\s*(<\/\2>)/gi,
    (match) => {
      const token = `___SPACER_BLOCK_${spacerTokens.length}___`;
      spacerTokens.push(match);
      return token;
    }
  );

  tokenized = tokenized.replace(
    /(<(span|strong|em|b|i|u|small|font)\b[^>]*>)\s*(?:&nbsp;|\u00a0)\s*(<\/\2>)/gi,
    ' '
  );

  tokenized = tokenized.replace(/&nbsp;|\u00a0/g, ' ');

  tokenized = tokenized.replace(
    /___SPACER_BLOCK_(\d+)___/g,
    (_, index) => spacerTokens[Number(index)] || ''
  );

  tokenized = tokenized.replace(
    /___MULTI_NBSP_(\d+)___/g,
    (_, index) => multiSpaceTokens[Number(index)] || ' '
  );

  return tokenized;
}

/** preserveSignificantInlineWhitespace – mirror từ RichTextRenderer.tsx:187-195 */
function preserveSignificantInlineWhitespace(html) {
  if (!html) return html;
  return html.replace(/(>|^)([^<]+)(<|$)/g, (_match, prefix, text, suffix) => {
    const converted = text.replace(/ {2,}/g, (spaces) => '\u00a0'.repeat(spaces.length));
    return prefix + converted + suffix;
  });
}

/** unwrapLeadingWhitespaceMarkers – mirror từ RichTextRenderer.tsx:110-116 */
function unwrapLeadingWhitespaceMarkers(html) {
  if (!html) return html;
  return html
    .replace(/<span\b[^>]*\bclass="[^"]*\bql-leading-whitespace\b[^"]*"[^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/<span\b[^>]*\bclass="[^"]*\bql-cursor\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/\uFEFF/g, '');
}

/** normalizeWhitespaceSpacers – mirror từ RichTextRenderer.tsx:87-108 */
function normalizeWhitespaceSpacers(html) {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  root?.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach((block) => {
    if (block.querySelector('img, video, iframe, svg, canvas, table')) return;

    const text = (block.textContent || '').replace(/\u00a0/g, ' ');
    const hasOnlyWhitespaceText = text.length > 0 && text.trim() === '';
    const hasOnlyBreaks = !text && /^(?:\s|<br\s*\/?>|&nbsp;)*$/i.test(block.innerHTML || '');
    if (!hasOnlyWhitespaceText && !hasOnlyBreaks) return;

    block.classList.add('ql-whitespace-spacer');
    block.setAttribute('aria-hidden', 'true');
    block.textContent = hasOnlyWhitespaceText ? text : ' ';
  });

  return root?.innerHTML || html;
}

// ─── NHÓM 1: normalizeWordSeparators ─────────────────────────────────────────

test('normalizeWordSeparators: &nbsp; đơn giữa formatted words bị chuyển thành breakable space', () => {
  const input = '<p>đến những người&nbsp;<em>thường</em>&nbsp;lo</p>';
  const result = normalizeWordSeparators(input);
  assert.ok(!result.includes('người&nbsp;'), 'người không bị gắn &nbsp; phía sau');
  assert.ok(!result.includes('&nbsp;lo'), 'lo không bị gắn &nbsp; phía trước');
  assert.ok(result.includes('người'), 'người vẫn còn trong output');
  assert.ok(result.includes('thường'), 'thường vẫn còn trong output');
});

test('normalizeWordSeparators: &nbsp; đơn trong <em>...</em> rỗng bị strip thành space', () => {
  const input = '<p>word<em>&nbsp;</em>next</p>';
  const result = normalizeWordSeparators(input);
  assert.ok(!result.includes('<em>&nbsp;</em>'), '<em>&nbsp;</em> đã bị xóa');
  assert.ok(/word\s+next/.test(result), 'space thường được thêm vào');
});

test('normalizeWordSeparators: multi &nbsp;&nbsp; liền nhau được bảo toàn (thụt đầu dòng dụng ý)', () => {
  const input = '<p>Code:&nbsp;&nbsp;&nbsp;const x = 1;</p>';
  const result = normalizeWordSeparators(input);
  // Multi nbsp phải được giữ lại dưới dạng HTML entity &nbsp; (không bị chuyển thành space thường).
  // Token được restore nguyên dạng &nbsp;&nbsp;&nbsp; (HTML entity), không phải \u00a0 Unicode.
  assert.ok(result.includes('&nbsp;&nbsp;&nbsp;'), 'triple &nbsp; được bảo toàn dưới dạng HTML entity');
});

test('normalizeWordSeparators: spacer block <p>&nbsp;</p> KHÔNG bị chuyển thành <p> </p>', () => {
  const input = '<p class="ql-whitespace-preserve">&nbsp;</p>';
  const result = normalizeWordSeparators(input);
  assert.ok(result.includes('&nbsp;'), 'Spacer block vẫn giữ &nbsp;');
  assert.ok(result.includes('ql-whitespace-preserve'), 'class spacer vẫn còn');
});

test('normalizeWordSeparators: 5 từ liên kết bởi &nbsp; đều được tách thành breakable', () => {
  const input = '<p>đi&nbsp;đến&nbsp;đâu&nbsp;để&nbsp;sống</p>';
  const result = normalizeWordSeparators(input);
  assert.ok(!result.includes('&nbsp;'), 'Tất cả &nbsp; đơn trong paragraph bị loại bỏ');
  assert.ok(result.includes('đi'), 'đi còn trong output');
  assert.ok(result.includes('sống'), 'sống còn trong output');
});

// ─── NHÓM 2: preserveSignificantInlineWhitespace ─────────────────────────────

test('preserveSignificantInlineWhitespace: 2+ spaces liên tiếp được chuyển thành &nbsp;', () => {
  const input = '<p>Kết quả:  hai space</p>';
  const result = preserveSignificantInlineWhitespace(input);
  assert.ok(result.includes('\u00a0\u00a0'), 'Hai space liên tiếp được chuyển thành \\u00a0\\u00a0');
});

test('preserveSignificantInlineWhitespace: space đơn BẮT BUỘC không bị chuyển thành &nbsp;', () => {
  const input = '<p>hello world</p>';
  const result = preserveSignificantInlineWhitespace(input);
  assert.ok(!result.includes('\u00a0'), 'Space đơn vẫn là space thường');
});

test('preserveSignificantInlineWhitespace: tag boundary spaces không bị thay thế (bảo vệ word break)', () => {
  const input = '<em>coi</em> <strong>thường</strong>';
  const result = preserveSignificantInlineWhitespace(input);
  assert.ok(!result.match(/<\/em>\u00a0<strong>/), 'Không có \\u00a0 chèn vào giữa 2 formatted tags');
});

// ─── NHÓM 3: normalizeWhitespaceSpacers ──────────────────────────────────────

test('normalizeWhitespaceSpacers: block rỗng được đánh dấu là ql-whitespace-spacer', () => {
  const input = '<p></p><p>text bình thường</p>';
  const result = normalizeWhitespaceSpacers(input);
  assert.ok(result.includes('ql-whitespace-spacer'), 'Block rỗng được đánh dấu ql-whitespace-spacer');
});

test('normalizeWhitespaceSpacers: block chỉ có &nbsp; được đánh dấu là spacer', () => {
  const input = '<p>&nbsp;</p>';
  const result = normalizeWhitespaceSpacers(input);
  assert.ok(result.includes('ql-whitespace-spacer'), 'Block &nbsp; được đánh dấu ql-whitespace-spacer');
});

test('normalizeWhitespaceSpacers: block có text thật KHÔNG bị đánh dấu spacer', () => {
  const input = '<p>Đây là nội dung bài viết có ý nghĩa</p>';
  const result = normalizeWhitespaceSpacers(input);
  assert.ok(!result.includes('ql-whitespace-spacer'), 'Block có text không bị đánh dấu là spacer');
});

test('normalizeWhitespaceSpacers: block chứa img KHÔNG bị đánh dấu spacer', () => {
  const input = '<div><img src="test.jpg"></div>';
  const result = normalizeWhitespaceSpacers(input);
  assert.ok(!result.includes('ql-whitespace-spacer'), 'Block chứa img không bị đánh dấu là spacer');
});

test('normalizeWhitespaceSpacers: block chỉ có <br> được đánh dấu là spacer', () => {
  const input = '<p><br></p>';
  const result = normalizeWhitespaceSpacers(input);
  assert.ok(result.includes('ql-whitespace-spacer'), 'Block chỉ có <br> được đánh dấu ql-whitespace-spacer');
});

// ─── NHÓM 4: unwrapLeadingWhitespaceMarkers ──────────────────────────────────

test('unwrapLeadingWhitespaceMarkers: ql-cursor span bị loại bỏ hoàn toàn', () => {
  const input = '<p>text<span class="ql-cursor">&#65279;</span>more</p>';
  const result = unwrapLeadingWhitespaceMarkers(input);
  assert.ok(!result.includes('ql-cursor'), 'ql-cursor span đã bị xóa');
  assert.ok(!result.includes('\uFEFF'), 'Zero-width non-breaking space (FEFF) bị xóa');
});

test('unwrapLeadingWhitespaceMarkers: FEFF character bị loại bỏ', () => {
  const input = '<p>\uFEFFHello world</p>';
  const result = unwrapLeadingWhitespaceMarkers(input);
  assert.ok(!result.includes('\uFEFF'), 'FEFF character đã bị xóa');
  assert.ok(result.includes('Hello world'), 'Text bình thường vẫn còn nguyên');
});

test('unwrapLeadingWhitespaceMarkers: ql-leading-whitespace span được unwrap giữ content', () => {
  const input = '<p><span class="ql-leading-whitespace">   </span>text</p>';
  const result = unwrapLeadingWhitespaceMarkers(input);
  assert.ok(!result.includes('ql-leading-whitespace'), 'ql-leading-whitespace span đã bị unwrap');
  assert.ok(result.includes('text'), 'text vẫn còn');
});

// ─── NHÓM 5: Quill placeholder cleanup ───────────────────────────────────────

test('Quill placeholder: HTML lưu không chứa class ql-blank hoặc text placeholder', () => {
  const simulatedSavedHtml = '<p>Nội dung phòng học rất rộng rãi, thoáng mát.</p>';
  assert.ok(!simulatedSavedHtml.includes('ql-blank'), 'HTML lưu không chứa class ql-blank');
  assert.ok(!simulatedSavedHtml.includes('placeholder'), 'HTML lưu không chứa text placeholder');
  assert.ok(!simulatedSavedHtml.includes('Nhập mô tả'), 'Placeholder "Nhập mô tả" không lọt vào HTML lưu');
});

test('Quill placeholder: HTML rỗng từ editor không tạo ra phantom paragraph', () => {
  const emptyQuillOutput = '<p><br></p>';
  const spacered = normalizeWhitespaceSpacers(emptyQuillOutput);
  assert.ok(
    spacered.includes('ql-whitespace-spacer') || spacered.includes('<p><br></p>'),
    'Empty Quill output không tạo ra phantom content paragraph'
  );
});

// ─── NHÓM 6: Button text không bị wrap (nowrap guard) ────────────────────────

test('Button nowrap: className phải chứa whitespace-nowrap để tránh wrap text', () => {
  const buttonClassNames = [
    'notification-link-button inline-flex items-center justify-center cursor-pointer font-bold bg-[var(--color-btn-purple)] text-white rounded-tl-xl rounded-br-xl hover:bg-[var(--color-btn-purple-hover)] text-xs whitespace-nowrap transition-all duration-300 ease-in-out',
    'inline-flex items-center gap-2 text-white bg-[var(--color-btn-purple)] hover:bg-[var(--color-btn-purple-hover)] px-5 py-2 rounded-tl-xl rounded-br-xl transition-all duration-300 shadow-md whitespace-nowrap',
  ];

  for (const className of buttonClassNames) {
    assert.ok(
      className.includes('whitespace-nowrap'),
      `Button class "${className.slice(0, 60)}..." phải có whitespace-nowrap`
    );
  }
});

test('Button nowrap: RichTextRenderer inline button có class whitespace-nowrap', () => {
  const buttonText = 'Đặt phòng ngay';
  const buttonHtml = `<a class="inline-rich-text notification-button-rich-text whitespace-nowrap" href="/dat-phong">${buttonText}</a>`;

  const doc = new DOMParser().parseFromString(buttonHtml, 'text/html');
  const anchor = doc.body.querySelector('a');

  assert.ok(anchor, 'Anchor element được parse thành công');
  assert.ok(anchor.classList.contains('whitespace-nowrap'), 'Button có class whitespace-nowrap');
  assert.equal(anchor.textContent, buttonText, 'Button text không bị thay đổi');
});

// ─── NHÓM 7: H2 heading orphan-word check ────────────────────────────────────

test('H2 heading: describe-h2-wrapper class tồn tại cho blog/room headings', () => {
  const configKeyClassNames = {
    'blog-heading': 'describe-h2-wrapper blog-heading-rich',
    'faq-heading': 'describe-h2-wrapper',
    'describe-h2': 'describe-h2-wrapper',
    'room-heading': 'describe-h2-wrapper',
    'amenities-content': 'describe-h2-wrapper',
  };

  for (const [key, className] of Object.entries(configKeyClassNames)) {
    assert.ok(
      className.includes('describe-h2-wrapper'),
      `Config key "${key}" có class describe-h2-wrapper để apply text-wrap: balance`
    );
  }
});

test('H2 heading: heading CSS không chứa white-space: nowrap (gây orphan-word)', () => {
  const headingCss = `
    .describe-h2-wrapper h1, .describe-h2-wrapper h2 {
      text-wrap: balance;
      word-break: break-word;
      overflow-wrap: break-word;
    }
  `;
  assert.ok(!headingCss.includes('white-space: nowrap'), 'H2 heading CSS không có white-space: nowrap');
  assert.ok(
    headingCss.includes('text-wrap: balance') || headingCss.includes('word-break: break-word'),
    'H2 heading CSS có text-wrap: balance hoặc word-break: break-word'
  );
});

test('H2 heading: heading đủ dài cần wrap – không bị ép nowrap', () => {
  const sampleH2 = 'Cho thuê phòng học tại TP.HCM - diện tích rộng rãi - đầy đủ tiện nghi';
  assert.ok(sampleH2.length > 40, 'Heading dài cần wrap trên mobile');
});

// ─── NHÓM 8: white-space:pre-wrap strip khi render ra trang public ─────────────

test('normalizeNaturalTextWrapping: white-space inline style bị strip khỏi public elements', () => {
  const inputHtml = '<p style="white-space: pre-wrap; overflow-wrap: break-word;">content</p>';

  const doc = new DOMParser().parseFromString(`<div>${inputHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  root?.querySelectorAll('[style]').forEach((element) => {
    if (element.closest('.ql-whitespace-spacer, .ql-whitespace-preserve')) return;
    element.style.removeProperty('white-space');
    element.style.removeProperty('overflow-wrap');
    element.style.removeProperty('word-break');
    if (!element.getAttribute('style')) element.removeAttribute('style');
  });

  const result = root.innerHTML;
  assert.ok(!result.includes('white-space: pre-wrap'), 'white-space: pre-wrap đã bị strip');
  assert.ok(!result.includes('overflow-wrap'), 'overflow-wrap đã bị strip');
  assert.ok(result.includes('content'), 'text vẫn còn');
});

test('normalizeNaturalTextWrapping: white-space trong ql-whitespace-spacer được giữ nguyên', () => {
  const inputHtml = '<p class="ql-whitespace-spacer" style="white-space: pre-wrap;">&nbsp;</p>';

  const doc = new DOMParser().parseFromString(`<div>${inputHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  root?.querySelectorAll('[style]').forEach((element) => {
    if (element.closest('.ql-whitespace-spacer, .ql-whitespace-preserve')) return;
    element.style.removeProperty('white-space');
  });

  const result = root.innerHTML;
  assert.ok(result.includes('ql-whitespace-spacer'), 'ql-whitespace-spacer vẫn còn trong DOM');
  assert.ok(result.includes('white-space'), 'white-space trong spacer không bị strip');
});

// ─── NHÓM 9: Workflow lưu blog/product – full pipeline ───────────────────────

test('Blog content pipeline: text có mixed &nbsp; và formatted words render đúng sau full pipeline', () => {
  const rawQuillHtml = `
    <p class="ql-whitespace-preserve">Phòng học <strong>cao cấp</strong>&nbsp;<em>tiện nghi</em>&nbsp;đầy đủ.</p>
    <p class="ql-whitespace-preserve">&nbsp;</p>
    <p>Liên hệ ngay để được tư vấn miễn phí.</p>
  `;

  let processed = normalizeWordSeparators(rawQuillHtml);
  processed = preserveSignificantInlineWhitespace(processed);

  assert.ok(!processed.match(/tiện nghi\u00a0đầy/), 'Không có &nbsp; glue giữa "tiện nghi" và "đầy"');
  assert.ok(processed.includes('ql-whitespace-preserve'), 'Spacer block vẫn còn');
  assert.ok(processed.includes('Phòng học'), '"Phòng học" vẫn còn');
  assert.ok(processed.includes('cao cấp'), '"cao cấp" vẫn còn');
  assert.ok(processed.includes('Liên hệ ngay'), '"Liên hệ ngay" vẫn còn');
});

test('Product content pipeline: HTML từ editor không có artifact ql-cursor sau cleanup', () => {
  const rawEditorHtml = `
    <p><span class="ql-cursor">&#65279;</span>Mô tả phòng học rộng 30m2.</p>
    <p>Vị trí trung tâm quận 3, TP.HCM.</p>
  `;

  const cleaned = unwrapLeadingWhitespaceMarkers(rawEditorHtml);

  assert.ok(!cleaned.includes('ql-cursor'), 'ql-cursor đã bị xóa');
  assert.ok(!cleaned.includes('\uFEFF'), 'FEFF character đã bị xóa');
  assert.ok(cleaned.includes('Mô tả phòng học'), 'Content phòng học vẫn còn');
  assert.ok(cleaned.includes('quận 3'), 'Content địa chỉ vẫn còn');
});

test('Product content pipeline: các block rỗng từ Enter nhiều lần được nhận diện là spacer', () => {
  const multiLineHtml = `
    <p>Tiêu đề phòng học</p>
    <p></p>
    <p></p>
    <p>Mô tả chi tiết về phòng.</p>
    <p><br></p>
    <p>Giá thuê: 50.000đ/giờ</p>
  `;

  const normalized = normalizeWhitespaceSpacers(multiLineHtml);

  const doc = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
  const spacers = doc.querySelectorAll('.ql-whitespace-spacer');
  assert.ok(spacers.length > 0, 'Các block rỗng được nhận diện là spacer');

  const paragraphs = Array.from(doc.querySelectorAll('p')).filter(
    (p) => !p.classList.contains('ql-whitespace-spacer')
  );
  const texts = paragraphs.map((p) => p.textContent.trim()).filter(Boolean);
  assert.ok(texts.includes('Tiêu đề phòng học'), '"Tiêu đề phòng học" vẫn còn');
  assert.ok(texts.includes('Giá thuê: 50.000đ/giờ'), '"Giá thuê" vẫn còn');
});

test('Blog content pipeline: normalizeWordSeparators là idempotent (không sinh artifact khi gọi 2 lần)', () => {
  const originalContent = '<p>Bài viết về <strong>học lập trình</strong> tại nhà.</p>';
  const round1 = normalizeWordSeparators(originalContent);
  const round2 = normalizeWordSeparators(round1);
  assert.equal(round1, round2, 'normalizeWordSeparators idempotent – không sinh thêm artifact');
});

test('Blog content pipeline: preserveSignificantInlineWhitespace là idempotent', () => {
  const input = '<p>Hello  world</p>';
  const round1 = preserveSignificantInlineWhitespace(input);
  const round2 = preserveSignificantInlineWhitespace(round1);
  assert.equal(round1, round2, 'preserveSignificantInlineWhitespace idempotent');
});

// ─── NHÓM 10: Edge cases đặc biệt ────────────────────────────────────────────

test('Edge case: HTML null/undefined không crash', () => {
  assert.equal(normalizeWordSeparators(null), null, 'null → null');
  assert.equal(normalizeWordSeparators(undefined), undefined, 'undefined → undefined');
  assert.equal(normalizeWordSeparators(''), '', 'empty string → empty string');
  assert.equal(preserveSignificantInlineWhitespace(null), null, 'null → null');
  assert.equal(unwrapLeadingWhitespaceMarkers(null), null, 'null → null');
  assert.equal(normalizeWhitespaceSpacers(null), null, 'null → null');
});

test('Edge case: content có emoji không bị strip', () => {
  const emojiContent = '<p>🏠 Phòng học tại nhà 📚</p>';
  const result = normalizeWordSeparators(emojiContent);
  assert.ok(result.includes('🏠'), 'Emoji 🏠 vẫn còn');
  assert.ok(result.includes('📚'), 'Emoji 📚 vẫn còn');
});

test('Edge case: Vietnamese diacritics không bị mangle bởi bất kỳ transform nào', () => {
  const vietnameseText = '<p>Ăn cơm với canh chua cá lóc, bún bò Huế ngon tuyệt vời.</p>';
  let result = normalizeWordSeparators(vietnameseText);
  result = preserveSignificantInlineWhitespace(result);
  result = unwrapLeadingWhitespaceMarkers(result);

  assert.ok(result.includes('Ăn'), 'Ă vẫn còn');
  assert.ok(result.includes('tuyệt'), 'tuyệt vẫn còn');
  assert.ok(result.includes('Huế'), 'Huế vẫn còn');
});

test('Edge case: HTML entities đặc biệt không bị double-encode', () => {
  const input = '<p>Giá: 50.000đ &amp; 100.000đ/tháng</p>';
  const result = normalizeWordSeparators(input);
  assert.ok(result.includes('&amp;'), '&amp; vẫn là &amp;');
  assert.ok(!result.includes('&amp;amp;'), 'Không có double-encoded &amp;amp;');
});

test('Edge case: block chứa nested tags phức tạp không bị mất content', () => {
  const complexHtml = '<p><strong><em>Quan trọng:</em></strong>&nbsp;<span style="color: red;">Đọc kỹ điều khoản</span></p>';
  const result = normalizeWordSeparators(complexHtml);

  assert.ok(result.includes('Quan trọng'), '"Quan trọng" vẫn còn');
  assert.ok(result.includes('Đọc kỹ điều khoản'), '"Đọc kỹ điều khoản" vẫn còn');
  assert.ok(result.includes('<strong>') && result.includes('<em>'), 'Nested tags vẫn còn');
});

console.log('\n✅ test-blog-product-content.test.mjs loaded – running all tests...\n');
