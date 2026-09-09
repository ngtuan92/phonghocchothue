import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { JSDOM } = await import('jsdom');
const DOMParser = new JSDOM().window.DOMParser;

function processWrapGroups(html) {
  let processedHtml = html;
  const preservedImageWrappers = [];
  processedHtml = processedHtml.replace(
    /<div\b[^>]*\bclass=["'][^"']*\bimage-wrapper\b[^"']*["'][^>]*>\s*<img\b[^>]*>\s*(?:<div\b[^>]*\bclass=["'][^"']*\bimage-caption\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*)?<\/div>/gi,
    (wrapperHtml) => {
      const token = `__PRESERVED_IMAGE_WRAPPER_${preservedImageWrappers.length}__`;
      preservedImageWrappers.push(wrapperHtml);
      return token;
    }
  );

  processedHtml = processedHtml.replace(/<img([^>]*?)\/?>\s*/gi, (match, attributes) => {
    let cleanAttrs = attributes.replace(/style=(["'])([^"']*?)\1/gi, (styleMatch, quote, styleContent) => {
      const cleaned = styleContent
        .replace(/width:\s*([^;!\s]+)\s*!important/gi, 'width: $1')
        .replace(/height:\s*([^;!\s]+)\s*!important/gi, 'height: $1');
      return `style=${quote}${cleaned}${quote}`;
    });

    const titleMatch = cleanAttrs.match(/title=["']([^"']*)["']/i);
    const captionMatch = cleanAttrs.match(/data-caption=["']([^"']*)["']/i);
    const wrapMatch = cleanAttrs.match(/data-wrap=["']([^"']*)["']/i);

    const hasDataCaption = /data-caption\s*=/i.test(cleanAttrs);
    const captionText = hasDataCaption
      ? (captionMatch?.[1] || "").trim()
      : (titleMatch?.[1] || "").trim();

    const wrapMode = wrapMatch?.[1] || 'none';
    const wrapClass = wrapMode === 'left' || wrapMode === 'right' ? ` image-wrap-${wrapMode}` : '';

    const widthMatch = cleanAttrs.match(/width=["']([^"']*)["']/i);
    const styleMatch = cleanAttrs.match(/style=["']([^"']*)["']/i);

    let inlineWidth = "";
    if (widthMatch) {
      const wVal = widthMatch[1].trim();
      inlineWidth = /^\d+$/.test(wVal) ? `${wVal}px` : wVal;
    } else if (styleMatch) {
      const styleStr = styleMatch[1];
      const widthStyle = styleStr.match(/width:\s*([^;]+)/i);
      if (widthStyle) {
        const wVal = widthStyle[1].trim();
        inlineWidth = /^\d+$/.test(wVal) ? `${wVal}px` : wVal;
      }
    }

    const wrapperStyle = inlineWidth ? ` style="width: ${inlineWidth}; max-width: 100%;"` : '';
    const captionHtml = captionText ? `<div class="image-caption">${captionText}</div>` : '';
    return `<div class="image-wrapper${wrapClass}" data-wrap="${wrapMode}"${wrapperStyle}><img${cleanAttrs}>${captionHtml}</div>`;
  });

  processedHtml = processedHtml.replace(
    /__PRESERVED_IMAGE_WRAPPER_(\d+)__/g,
    (match, index) => preservedImageWrappers[Number(index)] || match
  );

  processedHtml = processedHtml.replace(
    /<p[^>]*>\s*(<div\b[^>]*\bclass=["'][^"']*\bimage-wrapper\b[^"']*["'][^>]*>[\s\S]*?<\/div>)\s*<\/p>/gi,
    '$1'
  );

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${processedHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  root?.querySelectorAll('p').forEach((p) => {
    if (!p.children.length && !p.textContent?.trim() && !p.classList.contains('ql-whitespace-preserve') && !p.classList.contains('ql-whitespace-spacer')) {
      p.remove();
    }
  });

  root?.querySelectorAll('img').forEach((img) => {
    let wrapper = img.closest('.image-wrapper');
    const wrapMode = img.getAttribute('data-wrap') || wrapper?.getAttribute('data-wrap') || 'none';
    const caption = (
      img.getAttribute('data-caption')
      || img.getAttribute('title')
      || wrapper?.querySelector(':scope > .image-caption')?.textContent
      || ''
    ).replace(/\s+/g, ' ').trim();

    if (!wrapper) {
      wrapper = doc.createElement('div');
      wrapper.className = 'image-wrapper';
      const parentP = img.parentElement?.tagName === 'P' && img.parentElement.children.length === 1 && !img.parentElement.textContent?.trim()
        ? img.parentElement
        : null;
      const target = parentP || img;
      target.replaceWith(wrapper);
      wrapper.appendChild(img);
    }

    const wrapperEl = wrapper?.style ? wrapper : null;
    const imgEl = img?.style ? img : null;

    const cleanImageInlineStyle = (styleStr) => {
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
    };

    if (wrapperEl) {
      wrapperEl.setAttribute('data-wrap', wrapMode);
      wrapperEl.classList.remove('image-wrap-left', 'image-wrap-right');
      if (wrapMode === 'left' || wrapMode === 'right') {
        wrapperEl.classList.add(`image-wrap-${wrapMode}`);
      }

      const currentWrapperStyle = wrapperEl.getAttribute('style');
      const cleanedWrapperStyle = cleanImageInlineStyle(currentWrapperStyle);
      if (cleanedWrapperStyle) {
        wrapperEl.setAttribute('style', cleanedWrapperStyle);
      } else {
        wrapperEl.removeAttribute('style');
      }

      if (imgEl) {
        const currentImgStyle = imgEl.getAttribute('style');
        const cleanedImgStyle = cleanImageInlineStyle(currentImgStyle);
        if (cleanedImgStyle) {
          imgEl.setAttribute('style', cleanedImgStyle);
        } else {
          imgEl.removeAttribute('style');
        }
      }

      const finalWrapperStyle = wrapperEl.getAttribute('style') || '';
      if (!/width\s*:/i.test(finalWrapperStyle)) {
        const imageWidth = (imgEl && (imgEl.getAttribute('width') || imgEl.style?.width)) || '';
        const normalizedWidth = /^\d+$/.test(String(imageWidth).trim()) ? `${String(imageWidth).trim()}px` : String(imageWidth).trim();
        if (normalizedWidth) {
          wrapperEl.setAttribute(
            'style',
            finalWrapperStyle
              ? `${finalWrapperStyle}; width: ${normalizedWidth}; max-width: 100%;`
              : `width: ${normalizedWidth}; max-width: 100%;`
          );
        }
      }
    }

    if (caption && !wrapper.querySelector(':scope > .image-caption')) {
      const capDiv = doc.createElement('div');
      capDiv.className = 'image-caption';
      capDiv.textContent = caption;
      wrapper.appendChild(capDiv);
    }
  });

  const isWhitespaceSpacerBlock = (el) => {
    if (!el) return false;
    if (el.querySelector('img, video, iframe, svg, canvas, table, audio')) return false;
    const text = (el.textContent || '').replace(/[\u00a0\s]/g, '');
    if (text !== '') return false;
    const h = el.innerHTML || '';
    return /^(?:\s|<br\s*\/?>|&nbsp;|\u00a0)*$/i.test(h) || el.classList.contains('ql-whitespace-preserve');
  };

  root.querySelectorAll('.ql-whitespace-preserve').forEach((el) => {
    const text = (el.textContent || '').replace(/[\u00a0\s]/g, '');
    if (text !== '') {
      el.classList.remove('ql-whitespace-preserve');
    }
  });

  const wrapWrappers = Array.from(
    root.querySelectorAll('.image-wrapper.image-wrap-left, .image-wrapper.image-wrap-right')
  );

  wrapWrappers.forEach((wrapper) => {
    if (wrapper.parentElement?.classList.contains('rich-text-wrap-group')) return;

    const isWrapLeft = wrapper.classList.contains('image-wrap-left');
    const wrapMode = isWrapLeft ? 'left' : 'right';
    const parent = wrapper.parentNode;
    if (!parent) return;

    // 1. Collect leading spacer blocks directly between image and wrapped text
    const leadingSpacers = [];
    let curr = wrapper.nextElementSibling;
    while (curr && isWhitespaceSpacerBlock(curr)) {
      leadingSpacers.push(curr);
      curr = curr.nextElementSibling;
    }

    // All leading spacers between image and wrapped text are preserved on desktop
    // so intentional top spacing (Enter) is rendered beside the image.
    // They are marked with wrap-spacer-mobile-hide so on mobile they are hidden.
    const intentionalLeadingSpacers = [];
    for (let i = 0; i < leadingSpacers.length; i++) {
      leadingSpacers[i].classList.add('ql-whitespace-preserve', 'wrap-spacer-mobile-hide');
      if (!leadingSpacers[i].innerHTML || leadingSpacers[i].innerHTML.trim() === '') {
        leadingSpacers[i].innerHTML = '&nbsp;';
      }
      intentionalLeadingSpacers.push(leadingSpacers[i]);
    }

    // 2. Collect ALL consecutive content blocks belonging to this wrap section
    const textSiblings = [...intentionalLeadingSpacers];
    while (
      curr &&
      !isWhitespaceSpacerBlock(curr) &&
      !curr.classList.contains('image-wrapper') &&
      !curr.classList.contains('rich-text-wrap-group') &&
      !curr.querySelector('.image-wrapper, img, video, iframe, table') &&
      !/^(HR|H1|H2|H3|H4|H5|H6|TABLE|FIGURE|IFRAME)$/i.test(curr.tagName)
    ) {
      textSiblings.push(curr);
      curr = curr.nextElementSibling;
    }

    // 3. Consume ALL trailing whitespace spacers directly following the wrapped text.
    // In Quill, hitting Enter at the end of wrapped text creates empty spacer blocks
    // (often tagged with editor-image-spacer-mobile-hide / image-spacer-mobile-hide)
    // simply to advance the cursor below the floated image in the editor.
    // Since rich-text-wrap-group (flow-root on desktop, flex-col on mobile) already isolates
    // the float and starts subsequent content on a new line, all consecutive trailing exit spacers
    // are non-intentional artifacts and cause unwanted blank gaps.
    while (curr && isWhitespaceSpacerBlock(curr)) {
      const exitSpacer = curr;
      curr = curr.nextElementSibling;
      exitSpacer.remove();
    }

    if (textSiblings.length > 0) {
      const group = doc.createElement('div');
      group.className = `rich-text-wrap-group wrap-${wrapMode}`;

      const textContainer = doc.createElement('div');
      textContainer.className = 'rich-text-wrap-text';

      parent.insertBefore(group, wrapper);
      group.appendChild(wrapper);

      textSiblings.forEach((sibling) => {
        textContainer.appendChild(sibling);
      });

      group.appendChild(textContainer);
    }
  });

  return root;
}

test('Unit Test: Plane section groups all 3 wrapped paragraphs and separates the trailing section without extra gap', () => {
  const fixture = `
    <p>Intro paragraph</p>
    <div class="image-wrapper image-wrap-left"><img src="plane.jpg" data-wrap="left" width="404px"></div>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide">&nbsp;</p>
    <p class="ql-whitespace-preserve">Bài toán đặt ra lúc này là nên tăng cường giáp phòng vệ ở đâu để tối ưu hóa. (Mấy feng tạm dừng đọc và nghĩ chơi thử ).</p>
    <p class="ql-whitespace-preserve">Câu trả lời khá bất ngờ khi giáp phòng thủ được đề xuất tăng cường ở những chỗ mà phân bố đạn bị bắn không thấy xuất hiện.</p>
    <p class="ql-whitespace-preserve">Đơn giản là vì khi thu thập dữ liệu phân bố đạn... toàn ăn đạn ở buồng nhiên liệu và buồng phi công.</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide">&nbsp;</p>
    <p class="ql-whitespace-preserve">Đọc xong đoạn này thì tôi nhận ra là não chúng ta rất giới hạn và có nhiều lỗi về nhận thức - tư duy.</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-left');
  assert.ok(wrapGroup, 'Wrap group exists');

  const textContainer = wrapGroup.querySelector('.rich-text-wrap-text');
  assert.ok(textContainer, 'Text container exists inside wrap group');

  // Verify leading spacer + 3 paragraphs are inside textContainer
  const paragraphs = textContainer.querySelectorAll('p');
  assert.equal(paragraphs.length, 4, 'Must contain 1 leading spacer and 3 content paragraphs');
  assert.ok(paragraphs[0].classList.contains('wrap-spacer-mobile-hide'), 'First paragraph is the leading spacer');
  assert.ok(paragraphs[1].textContent.includes('Bài toán đặt ra'));
  assert.ok(paragraphs[2].textContent.includes('Câu trả lời khá bất ngờ'));
  assert.ok(paragraphs[3].textContent.includes('Đơn giản là vì'));

  // Verify redundant exit spacer is consumed, and Đọc xong đoạn này follows directly
  const nextSibling = wrapGroup.nextElementSibling;
  assert.ok(nextSibling, 'Next content follows wrap group');
  assert.ok(nextSibling.textContent.includes('Đọc xong đoạn này'), 'Đọc xong đoạn này immediately follows wrap group without blank gap');
});

test('Unit Test: Gold coins section preserves intentional leading whitespace on desktop', () => {
  const fixture = `
    <div class="image-wrapper image-wrap-right"><img src="gold.jpg" data-wrap="right" width="323px"></div>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide">&nbsp;</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide">&nbsp;</p>
    <p class="ql-whitespace-preserve">Trong một thế giới mà chúng ta liên tục bị bao phủ bởi những câu chuyện thành công phi thường...</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide">&nbsp;</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide">&nbsp;</p>
    <p class="ql-whitespace-preserve">Nói đơn giản (theo cách tôi hiểu)...</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-right');
  assert.ok(wrapGroup, 'Wrap group exists');

  const textContainer = wrapGroup.querySelector('.rich-text-wrap-text');
  const children = textContainer.children;
  assert.equal(children.length, 3, 'Must contain 2 intentional spacers and 1 text paragraph');

  // First and second children should be the intentional spacers
  assert.ok(children[0].classList.contains('wrap-spacer-mobile-hide'), 'Intentional spacer 1 has wrap-spacer-mobile-hide');
  assert.ok(children[1].classList.contains('wrap-spacer-mobile-hide'), 'Intentional spacer 2 has wrap-spacer-mobile-hide');
  // Third child should be the text paragraph
  assert.ok(children[2].textContent.includes('Trong một thế giới'), 'Text paragraph follows intentional spacers');

  // Verify trailing exit spacers are all consumed so Nói đơn giản follows directly without blank gap
  const nextSibling = wrapGroup.nextElementSibling;
  assert.ok(nextSibling, 'Next sibling exists');
  assert.ok(nextSibling.textContent.includes('Nói đơn giản'), 'Nói đơn giản immediately follows wrap group without trailing blank gap');
});

test('Unit Test: Real blog HTML transforms correctly across all 5 images', () => {
  const realHtmlPath = 'C:/Users/Tuan92/.gemini/antigravity-ide/brain/7b54e1cd-af7d-4c0b-aa56-1ccf7dc8e63e/scratch/latest_blog_content.html';
  if (!fs.existsSync(realHtmlPath)) return;
  const realHtml = fs.readFileSync(realHtmlPath, 'utf8');

  const root = processWrapGroups(realHtml);
  const groups = root.querySelectorAll('.rich-text-wrap-group');
  assert.equal(groups.length, 5, 'All 5 wrap images in the real blog are grouped');

  // Check Plane group (group 0)
  const planeGroup = groups[0];
  assert.ok(planeGroup.classList.contains('wrap-left'));
  const planeTextChildren = planeGroup.querySelector('.rich-text-wrap-text').querySelectorAll('p');
  assert.equal(planeTextChildren.length, 4, 'Plane wrap text must contain 1 leading spacer + 3 paragraphs');
  assert.ok(planeTextChildren[0].classList.contains('wrap-spacer-mobile-hide'), 'Plane has leading spacer at top');
  assert.ok(planeTextChildren[1].textContent.includes('Bài toán đặt ra'));
  assert.ok(planeTextChildren[2].textContent.includes('Câu trả lời khá bất ngờ'));
  assert.ok(planeTextChildren[3].textContent.includes('buồng phi công'));

  // Following plane group should be 'Đọc xong đoạn này' directly without the redundant exit spacer
  assert.ok(planeGroup.nextElementSibling.textContent.includes('Đọc xong đoạn này'), 'Plane group followed directly by next paragraph without blank space');

  // Check Gold coins group (group 1)
  const goldGroup = groups[1];
  assert.ok(goldGroup.classList.contains('wrap-right'));
  const goldChildren = goldGroup.querySelector('.rich-text-wrap-text').children;
  assert.equal(goldChildren.length, 3, 'Gold coins has 2 intentional spacers and 1 text paragraph');
  assert.ok(goldChildren[0].classList.contains('wrap-spacer-mobile-hide'), 'Intentional spacer 1 is first child');
  assert.ok(goldChildren[1].classList.contains('wrap-spacer-mobile-hide'), 'Intentional spacer 2 is second child');
  assert.ok(goldChildren[2].textContent.includes('Trong một thế giới'));
});

test('Unit Test: Bare wrap-left image without caption is properly grouped and isolated', () => {
  const fixture = `
    <p>Opening paragraph</p>
    <img src="bare-left.jpg" data-wrap="left" width="300">
    <p class="ql-whitespace-preserve">&nbsp;</p>
    <p>This is wrapped text beside bare image</p>
    <p class="ql-whitespace-preserve">&nbsp;</p>
    <p>Subsequent paragraph below</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-left');
  assert.ok(wrapGroup, 'Wrap group exists for uncaptioned wrap-left image');

  const textContainer = wrapGroup.querySelector('.rich-text-wrap-text');
  assert.ok(textContainer, 'Text container exists inside wrap group');

  const pInside = textContainer.querySelectorAll('p');
  assert.equal(pInside.length, 2, 'Contains 1 leading spacer and 1 wrapped paragraph');
  assert.ok(pInside[0].classList.contains('wrap-spacer-mobile-hide'), 'Leading spacer is tagged with wrap-spacer-mobile-hide');
  assert.ok(pInside[1].textContent.includes('This is wrapped text'), 'Wrapped text is inside wrap group');

  assert.ok(wrapGroup.nextElementSibling.textContent.includes('Subsequent paragraph below'), 'Next paragraph is outside wrap group without gap');
});

test('Unit Test: Bare wrap-right image without caption is properly grouped and isolated', () => {
  const fixture = `
    <p>Opening paragraph</p>
    <img src="bare-right.jpg" data-wrap="right" width="280">
    <p>Wrapped text right beside image</p>
    <p class="ql-whitespace-preserve">&nbsp;</p>
    <p>Next section below</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-right');
  assert.ok(wrapGroup, 'Wrap group exists for uncaptioned wrap-right image');

  const textContainer = wrapGroup.querySelector('.rich-text-wrap-text');
  assert.ok(textContainer.textContent.includes('Wrapped text right beside image'));
  assert.ok(wrapGroup.nextElementSibling.textContent.includes('Next section below'));
});

test('Unit Test: Center image (no-wrap) is never grouped into rich-text-wrap-group', () => {
  const fixture = `
    <p>Before center image</p>
    <img src="center.jpg" width="600">
    <p>After center image</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group');
  assert.equal(wrapGroup, null, 'No wrap group created for center image');

  const imgWrapper = root.querySelector('.image-wrapper');
  assert.ok(imgWrapper, 'Center image is normalized into .image-wrapper');
  assert.equal(imgWrapper.getAttribute('data-wrap'), 'none', 'data-wrap is none');
});

test('Unit Test: Image nested in <p> has phantom <p> removed and groups properly', () => {
  const fixture = `
    <p><img src="nested.jpg" data-wrap="left" width="350"></p>
    <p>Text wrapped beside nested image</p>
    <p class="ql-whitespace-preserve">&nbsp;</p>
    <p>Following text</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-left');
  assert.ok(wrapGroup, 'Wrap group formed despite initial <p> nesting');

  // Verify no empty phantom <p></p>
  const emptyPs = Array.from(root.querySelectorAll('p')).filter(p => !p.textContent.trim() && !p.classList.contains('ql-whitespace-preserve'));
  assert.equal(emptyPs.length, 0, 'No empty phantom <p> tags remain in DOM');
});

test('Unit Test: Heading following wrap group terminates wrap group and stays outside', () => {
  const fixture = `
    <div class="image-wrapper image-wrap-left"><img src="pic.jpg" data-wrap="left" width="300"></div>
    <p>Text beside image</p>
    <h2>Heading 2 That Clears Wrap</h2>
    <p>Paragraph under heading</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-left');
  assert.ok(wrapGroup, 'Wrap group exists');

  const textContainer = wrapGroup.querySelector('.rich-text-wrap-text');
  assert.ok(textContainer.textContent.includes('Text beside image'));
  assert.ok(!textContainer.querySelector('h2'), 'Heading 2 is NOT inside wrap group');

  assert.equal(wrapGroup.nextElementSibling.tagName, 'H2', 'Heading 2 immediately follows wrap group');
});

test('Unit Test: Table following wrap group stays outside wrap group', () => {
  const fixture = `
    <div class="image-wrapper image-wrap-right"><img src="pic.jpg" data-wrap="right" width="300"></div>
    <p>Text beside image</p>
    <table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>
    <p>Paragraph under table</p>
  `;

  const root = processWrapGroups(fixture);
  const wrapGroup = root.querySelector('.rich-text-wrap-group.wrap-right');
  assert.ok(wrapGroup, 'Wrap group exists');

  const textContainer = wrapGroup.querySelector('.rich-text-wrap-text');
  assert.ok(!textContainer.querySelector('table'), 'Table is NOT inside wrap group');
  assert.equal(wrapGroup.nextElementSibling.tagName, 'TABLE', 'Table immediately follows wrap group');
});

test('Unit Test: Word separator normalization prevents unbreakable compounds around formatted tags while preserving intentional spacer blocks', () => {
  const normalizeWordSeparators = (html) => {
    if (!html) return html;
    const multiSpaceTokens = [];
    let tokenized = html.replace(/(?:&nbsp;|\u00a0| ){2,}/g, (match) => {
      const token = `___MULTI_NBSP_${multiSpaceTokens.length}___`;
      multiSpaceTokens.push(match.replace(/ /g, '\u00a0'));
      return token;
    });
    const spacerTokens = [];
    tokenized = tokenized.replace(/(<(p|div|h[1-6]|li)\b[^>]*>)\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*\s*(<\/\2>)/gi, (match) => {
      const token = `___SPACER_BLOCK_${spacerTokens.length}___`;
      spacerTokens.push(match);
      return token;
    });
    tokenized = tokenized.replace(/(<(span|strong|em|b|i|u|small|font)\b[^>]*>)\s*(?:&nbsp;|\u00a0)\s*(<\/\2>)/gi, ' ');
    tokenized = tokenized.replace(/&nbsp;|\u00a0/g, ' ');
    tokenized = tokenized.replace(/___SPACER_BLOCK_(\d+)___/g, (_, index) => spacerTokens[Number(index)] || '');
    tokenized = tokenized.replace(/___MULTI_NBSP_(\d+)___/g, (_, index) => multiSpaceTokens[Number(index)] || ' ');
    return tokenized;
  };

  const preserveSignificantInlineWhitespace = (html) => {
    if (!html) return html;
    return html.replace(/(>|^)([^<]+)(<|$)/g, (_match, prefix, text, suffix) => {
      const converted = text.replace(/ {2,}/g, (spaces) => "\u00a0".repeat(spaces.length));
      return prefix + converted + suffix;
    });
  };

  // Test case with formatted words like in real blog
  const inputHtml = '<p>đến những người&nbsp;</em><strong><em>coi</em></strong><em>&nbsp;</em><strong><em>thường</em></strong><em>&nbsp;những nguy cơ</p><p class="ql-whitespace-preserve">&nbsp;</p>';
  let processed = normalizeWordSeparators(inputHtml);
  processed = preserveSignificantInlineWhitespace(processed);

  // Assert that words 'người', 'coi', 'thường', 'những' are NOT bound by \u00a0 or &nbsp;
  assert.ok(!processed.includes('người\u00a0'), 'người does not have non-breaking space');
  assert.ok(!processed.includes('&nbsp;những'), 'những does not have leading &nbsp;');
  assert.ok(!processed.includes('\u00a0coi'), 'coi does not have non-breaking space');
  assert.ok(!processed.includes('\u00a0thường'), 'thường does not have non-breaking space');

  // Assert that empty spacer block is preserved
  assert.ok(processed.includes('<p class="ql-whitespace-preserve">&nbsp;</p>'), 'Spacer block &nbsp; is preserved');
});

test('Unit Test: Inline wrap styles (float, margin-left 20px, !important) are stripped from image wrappers so mobile layout is not shifted', () => {
  const inputHtml = `
    <div class="image-wrapper image-wrap-right" contenteditable="false" data-wrap="right" style="float: right !important; display: inline !important; clear: both !important; max-width: 100% !important; margin: 0px 0px 4px 20px !important; width: 308px !important;">
      <img src="test-gold.jpg" data-wrap="right" style="display: block !important; margin: 0px !important; max-width: 100% !important; height: auto !important; width: 308px !important;" width="308px">
      <div class="image-caption">Bức tranh minh họa</div>
    </div>
    <p>Đoạn văn tiếp nối hình ảnh để tạo thành nhóm bọc chữ wrap-right.</p>
  `;

  const root = processWrapGroups(inputHtml);
  const wrapper = root.querySelector('.image-wrapper');
  assert.ok(wrapper, 'Image wrapper exists');
  assert.ok(wrapper.classList.contains('image-wrap-right'), 'Has image-wrap-right class');
  assert.equal(wrapper.getAttribute('data-wrap'), 'right', 'data-wrap is right');

  const wrapperStyle = wrapper.getAttribute('style') || '';
  assert.ok(!wrapperStyle.includes('float'), 'float is removed from inline style');
  assert.ok(!wrapperStyle.includes('margin-left'), 'margin-left is removed from inline style');
  assert.ok(!wrapperStyle.includes('margin:'), 'margin is removed from inline style');
  assert.ok(!wrapperStyle.includes('!important'), '!important is removed from inline style');
  assert.ok(wrapperStyle.includes('width: 308px'), 'width is preserved without !important');

  const img = wrapper.querySelector('img');
  assert.ok(img, 'Image exists');
  const imgStyle = img.getAttribute('style') || '';
  assert.ok(!imgStyle.includes('float'), 'img float is removed');
  assert.ok(!imgStyle.includes('margin:'), 'img margin is removed');
  assert.ok(!imgStyle.includes('!important'), 'img !important is removed');
  assert.ok(imgStyle.includes('width: 308px'), 'img width is preserved without !important');
});

test('Unit Test: Multiple trailing exit spacers after wrap text are ALL consumed so no blank gaps exist before next content', () => {
  const inputHtml = `
    <div class="image-wrapper image-wrap-right" data-wrap="right">
      <img src="painting.jpg" data-wrap="right">
      <div class="image-caption">To have to stoop to get on in the world</div>
    </div>
    <p>To have to stoop to get on in the world</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide ql-whitespace-spacer">&nbsp;</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide ql-whitespace-spacer">&nbsp;</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide ql-whitespace-spacer">&nbsp;</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide image-spacer-mobile-hide ql-whitespace-spacer">&nbsp;</p>
    <p>7. Câu tục ngữ gốc nó là To have the world spinning on one's thumb</p>
  `;

  const root = processWrapGroups(inputHtml);
  const wrapGroup = root.querySelector('.rich-text-wrap-group');
  assert.ok(wrapGroup, 'Wrap group created');

  // Verify wrapped text inside group
  const wrapText = wrapGroup.querySelector('.rich-text-wrap-text');
  assert.ok(wrapText, 'Wrap text container exists');
  assert.ok(wrapText.textContent.includes('To have to stoop'), 'Contains wrapped text');

  // Verify that the immediate next sibling of the wrap group is the next real paragraph!
  const nextElement = wrapGroup.nextElementSibling;
  assert.ok(nextElement, 'Has next sibling element');
  assert.equal(nextElement.tagName, 'P', 'Next element is paragraph');
  assert.ok(nextElement.textContent.includes('7. Câu tục ngữ gốc'), 'Next element is paragraph 7 directly without any spacer blocks!');

  // Verify there are NO trailing spacer paragraphs remaining between wrap group and paragraph 7
  const allSpacers = root.querySelectorAll('.editor-image-spacer-mobile-hide, .image-spacer-mobile-hide');
  assert.equal(allSpacers.length, 0, 'All 4 trailing exit spacers were consumed and eliminated');
});
