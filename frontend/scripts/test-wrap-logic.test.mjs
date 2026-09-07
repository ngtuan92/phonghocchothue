import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { JSDOM } = await import('jsdom');
const DOMParser = new JSDOM().window.DOMParser;

function processWrapGroups(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

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
      !/^(HR|H1|H2|H3|H4|H5|H6)$/i.test(curr.tagName)
    ) {
      textSiblings.push(curr);
      curr = curr.nextElementSibling;
    }

    // 3. Consume the first trailing whitespace spacer directly following the wrapped text.
    // In Quill, hitting Enter once at the end of wrapped text creates an empty block
    // to exit/break to a new line. Since rich-text-wrap-group (flow-root) already isolates
    // the float and starts subsequent content on a new line, this first spacer is redundant
    // and causes an unwanted blank gap between wraptext and the following paragraph.
    if (curr && isWhitespaceSpacerBlock(curr)) {
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

  // Verify trailing content is outside
  const nextSibling = wrapGroup.nextElementSibling;
  assert.ok(nextSibling.classList.contains('ql-whitespace-preserve'), 'Trailing spacer is outside wrap group');
  assert.ok(nextSibling.nextElementSibling.textContent.includes('Nói đơn giản'), 'Nói đơn giản is outside wrap group');
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

