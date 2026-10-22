/**
 * Mobile grouping must not change desktop float flow. An empty paragraph is
 * author content, not a reliable signal that text has stopped wrapping.
 * @param {Element} wrapper
 * @param {(element: Element) => boolean} isSectionTitle
 * @returns {Element[]}
 */
export function collectWrapTextSiblings(wrapper, isSectionTitle = isHeadingOrSectionTitle) {
  const siblings = [];
  let current = wrapper.nextElementSibling;
  while (current) {
    if (
      current.classList.contains('image-wrapper') ||
      current.classList.contains('rich-text-wrap-group') ||
      current.matches('img, video, iframe, audio, svg, canvas') ||
      current.querySelector('.image-wrapper, img, video, iframe, table') ||
      /^(HR|H1|H2|H3|H4|H5|H6|TABLE|FIGURE|IFRAME)$/i.test(current.tagName) ||
      isSectionTitle(current)
    ) break;
    siblings.push(current);
    current = current.nextElementSibling;
  }
  return siblings;
}

/** @param {Element | null} el */
export function isWhitespaceSpacerBlock(el) {
  if (!el) return false;
  if (!/^(P|DIV|H[1-6]|LI)$/.test(el.tagName)) return false;
  if (el.querySelector('img, video, iframe, svg, canvas, table, audio, hr')) return false;
  const text = (el.textContent || '').replace(/[\u00a0\s]/g, '');
  if (text !== '') return false;
  return true;
}

/** @param {Element | null} el */
export function isHeadingOrSectionTitle(el) {
  if (!el) return false;
  const tag = el.tagName.toUpperCase();
  if (/^(H1|H2|H3|H4|H5|H6)$/.test(tag)) return true;
  if (el.querySelector('h1, h2, h3, h4, h5, h6')) return true;

  const text = (el.textContent || '').trim();
  if (!text) return false;

  // Numbered section prefix: e.g. "1. ", "2. ", "1.1 ", "I. ", "A. " followed by letter/number
  const hasNumberedPrefix = /^\s*(?:\d+[\.\)]|[IVXLCDM]+[\.\)]|\d+\.\d+(?:\.\d+)?[\.\)]?)\s+[A-ZÀ-Ỹ0-9]/u.test(text);

  const hasBold =
    el.classList.toString().includes('bold') ||
    !!el.querySelector('[class*="bold"], strong, b') ||
    /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(el.getAttribute('style') || '');

  const fullHtml = el.outerHTML || '';
  const fsMatch = fullHtml.match(/--fs-desktop:\s*(\d+)px/i) || fullHtml.match(/font-size:\s*(\d+)px/i);
  const isLargeFont = fsMatch ? parseInt(fsMatch[1], 10) >= 19 : false;

  if (hasNumberedPrefix && text.length < 200) return true;
  if (hasBold && isLargeFont && text.length < 200) return true;

  // Check if this block immediately precedes another image-wrapper (skipping empty spacers)
  let probe = el.nextElementSibling;
  while (probe && isWhitespaceSpacerBlock(probe)) {
    probe = probe.nextElementSibling;
  }
  if (probe && (probe.classList.contains('image-wrapper') || probe.querySelector('.image-wrapper, img'))) {
    if (hasBold && text.length < 150) return true;
    if (isLargeFont && text.length < 150) return true;
  }

  return false;
}

/** @param {string | null} styleStr */
export function cleanImageInlineStyle(styleStr) {
  if (!styleStr) return '';
  return styleStr
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const lower = part.toLowerCase();
      if (
        lower.startsWith('float:') ||
        lower.startsWith('clear:') ||
        lower.startsWith('display:') ||
        lower.startsWith('margin:') ||
        lower.startsWith('margin-left:') ||
        lower.startsWith('margin-right:') ||
        lower.startsWith('margin-top:') ||
        lower.startsWith('margin-bottom:')
      ) {
        return false;
      }
      return true;
    })
    .map((part) => {
      if (/^(?:max-|min-)?(?:width|height)\s*:/i.test(part)) {
        return part.replace(/\s*!important/gi, '').trim();
      }
      return part;
    })
    .join('; ');
}

/** Mark the actual paragraph, before mobile grouping changes sibling relationships.
 * Recompute on editor changes so moving/deleting an image never leaves stale spacing.
 * @param {Element} root
 */
export function markParagraphsBeforeImages(root) {
  root.querySelectorAll('.has-following-wrap-image').forEach(el => el.classList.remove('has-following-wrap-image'));
  root.querySelectorAll('.image-wrapper').forEach(image => {
    const block = image.parentElement?.classList.contains('rich-text-wrap-group') ? image.parentElement : image;
    let previous = block.previousElementSibling;
    if (previous?.classList.contains('rich-text-wrap-group')) {
      previous = previous.querySelector('.rich-text-wrap-text')?.lastElementChild || null;
    }
    if (previous?.tagName === 'P' && !isWhitespaceSpacerBlock(previous)) {
      previous.classList.add('has-following-wrap-image');
    }
  });
}

/** Group only for mobile ordering; desktop keeps native floats and author spacers.
 * @param {Element} root
 */
export function groupWrapImages(root) {
  markParagraphsBeforeImages(root);
  const doc = root.ownerDocument;
  root.querySelectorAll('.image-wrapper.image-wrap-left, .image-wrapper.image-wrap-right').forEach(wrapper => {
    if (wrapper.parentElement?.classList.contains('rich-text-wrap-group')) return;
    const siblings = collectWrapTextSiblings(wrapper);
    if (!siblings.some(element => !isWhitespaceSpacerBlock(element))) return;
    const group = doc.createElement('div');
    group.className = `rich-text-wrap-group wrap-${wrapper.classList.contains('image-wrap-left') ? 'left' : 'right'}`;
    const text = doc.createElement('div');
    text.className = 'rich-text-wrap-text';
    wrapper.before(group);
    group.append(wrapper, text);
    siblings.forEach(element => text.append(element));
  });
}
