import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { chromium, webkit } from 'playwright';
import ts from 'typescript';
import { collectWrapTextSiblings, isWhitespaceSpacerBlock, cleanImageInlineStyle, markParagraphsBeforeImages, groupWrapImages } from '../src/utils/richTextWrap.mjs';

function editorStyles() {
  const source = readFileSync(new URL('../src/views/admin/QuillWrapper.jsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('QuillWrapper.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  let css = '';
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === '__html' && ts.isTemplateExpression(node.initializer)) {
      css += node.initializer.head.text + node.initializer.templateSpans.map(span => span.literal.text).join('');
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return css;
}

function fixture(side = 'right') {
  return `<div class="image-wrapper image-wrap-${side}" data-wrap="${side}" style="width:220px;height:330px"><img data-wrap="${side}" width="220" height="330" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='330'%3E%3C/svg%3E" alt="" /><div class="image-caption">Caption</div></div>
    <p>First paragraph beside the image.</p>
    <p class="ql-whitespace-preserve editor-image-spacer-mobile-hide"><br></p>
    <p>Second paragraph must stay beside the image after Enter.</p>
    <p>Third paragraph.</p><p><br></p><h2>Next section</h2><p>Outside wrap.</p>`;
}

function group(html) {
  const doc = new JSDOM(`<div id="content">${html}</div>`).window.document;
  const root = doc.querySelector('#content');
  groupWrapImages(root);
  return root;
}

test('Enter preserves paragraphs and spacers inside the same wrap section', () => {
  const root = group(fixture());
  assert.equal(root.querySelectorAll('.rich-text-wrap-text > p').length, 5);
  assert.equal(root.querySelectorAll('p').length, 6);
  assert.equal(root.querySelector('.rich-text-wrap-group').nextElementSibling.tagName, 'H2');
});

test('next image and section title remain outside the current wrap group', () => {
  for (const boundary of ['<div class="image-wrapper"><img></div>', '<hr>', '<p class="section">Title</p>']) {
    const doc = new JSDOM(`<div class="image-wrapper"></div><p>A</p><p><br></p>${boundary}<p>B</p>`).window.document;
    const siblings = collectWrapTextSiblings(doc.querySelector('.image-wrapper'), el => el.classList.contains('section'));
    assert.equal(siblings.length, 2);
  }
});

test('shared spacer and inline style normalization protect real content and image sizing', () => {
  const doc = new JSDOM('<p><br></p><p>Text</p><p><img></p><p><span>&nbsp;</span></p>').window.document;
  const paragraphs = doc.querySelectorAll('p');
  assert.equal(isWhitespaceSpacerBlock(paragraphs[0]), true);
  assert.equal(isWhitespaceSpacerBlock(paragraphs[1]), false);
  assert.equal(isWhitespaceSpacerBlock(paragraphs[2]), false);
  assert.equal(isWhitespaceSpacerBlock(paragraphs[3]), true);
  assert.equal(isWhitespaceSpacerBlock(doc.querySelector('img')), false);
  assert.equal(cleanImageInlineStyle('float:right!important;margin:20px; width:220px!important; border-radius:8px'), 'width:220px; border-radius:8px');
});

test('desktop Enter keeps text beside floats; mobile keeps text before image', async () => {
  const source = readFileSync(new URL('../src/components/RichTextRenderer.tsx', import.meta.url), 'utf8');
  const css = source.match(/const RICH_TEXT_RENDERER_STYLES = `([\s\S]*?)`;/)?.[1];
  assert.ok(css, 'Use the actual renderer stylesheet');
  const globalCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
  const imageCss = readFileSync(new URL('../src/styles/richTextImages.css', import.meta.url), 'utf8');
  const adminCss = editorStyles();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    for (const side of ['left', 'right']) {
      const html = fixture(side);
      await page.setContent(`<style>${globalCss}\n${css}\n${adminCss}\n${imageCss}\nbody{margin:0}.rich-text-renderer,.ql-editor{width:100%;max-width:1000px;font-size:20px;line-height:1.5}</style><div class="rich-text-renderer">${group(html).innerHTML}</div><div class="quill-wrapper-container"><div class="ql-editor">${html}</div></div>`);
      const imageStyle = selector => page.locator(selector).evaluate(el => {
        const style = getComputedStyle(el);
        return ['float', 'display', 'width', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'].map(key => style[key]);
      });
      assert.deepEqual(await imageStyle('.rich-text-renderer .image-wrapper'), await imageStyle('.ql-editor .image-wrapper'), 'Admin and user share desktop image layout');
      const positions = () => page.locator('.rich-text-renderer p').evaluateAll(els => els.map(el => ({ top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height })));
      const withSpacer = await positions();
      assert.ok(withSpacer[1].height > 0, 'Author spacer occupies a visible line');
      const imageBottom = await page.locator('.rich-text-renderer .image-wrapper').evaluate(el => el.getBoundingClientRect().bottom);
      assert.ok((await positions())[2].top < imageBottom, 'Second paragraph still wraps beside image');
      await page.locator('.rich-text-wrap-text > p').nth(1).evaluate(el => el.remove());
      assert.ok((await positions())[1].top < withSpacer[2].top, 'Removing Enter moves the second paragraph upward');
      await page.setViewportSize({ width: 390, height: 900 });
      const adminMobileStyle = await imageStyle('.ql-editor .image-wrapper');
      const publicMobileStyle = await imageStyle('.rich-text-renderer .image-wrapper');
      assert.equal(adminMobileStyle[0], 'none');
      assert.equal(publicMobileStyle[0], 'none');
      assert.equal(adminMobileStyle[2], publicMobileStyle[2], 'Explicit image width matches on mobile');
      const imageTop = await page.locator('.rich-text-renderer .image-wrapper').evaluate(el => el.getBoundingClientRect().top);
      const textBottom = await page.locator('.rich-text-wrap-text').evaluate(el => el.getBoundingClientRect().bottom);
      assert.ok(imageTop >= textBottom, 'Mobile image follows wrapped text');
      await page.setViewportSize({ width: 1200, height: 900 });
    }
  } finally {
    await browser.close();
  }
});


test('spacing markers survive grouping and are recomputed after image edits', () => {
  const root = group('<div class="image-wrapper image-wrap-right"><img></div><p>First text</p><p id="last">No pain no gain</p><div class="image-wrapper image-wrap-left"><img></div><p>Next text</p>');
  const paragraph = root.querySelector('#last');
  assert.ok(paragraph.classList.contains('has-following-wrap-image'));
  assert.equal(root.querySelectorAll('.rich-text-wrap-group.has-following-wrap-image').length, 0);
  groupWrapImages(root);
  assert.equal(root.querySelectorAll('.rich-text-wrap-group').length, 2, 'Repeated normalization is idempotent');
  assert.ok(paragraph.classList.contains('has-following-wrap-image'));
  root.querySelector('.wrap-left').remove();
  markParagraphsBeforeImages(root);
  assert.equal(paragraph.classList.contains('has-following-wrap-image'), false, 'Deleting image removes stale spacing');
  for (const count of [1, 3]) {
    const spaced = group(`<p id="before">Text</p>${'<p><br></p>'.repeat(count)}<div class="image-wrapper image-wrap-left"><img></div><p>Wrapped text</p>`);
    assert.equal(spaced.querySelectorAll('p').length, count + 2);
    assert.equal(spaced.querySelector('#before').classList.contains('has-following-wrap-image'), false, 'Explicit blank lines supply their own spacing');
  }
});

for (const engine of [chromium, webkit]) {
  test(`${engine.name()}: natural paragraph gap before the next float matches admin, including without :has()`, async () => {
    const source = readFileSync(new URL('../src/components/RichTextRenderer.tsx', import.meta.url), 'utf8');
    const css = source.match(/const RICH_TEXT_RENDERER_STYLES = `([\s\S]*?)`;/)[1];
    const globalCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
    const imageCss = readFileSync(new URL('../src/styles/richTextImages.css', import.meta.url), 'utf8');
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
      for (const side of ['left', 'right']) {
        const image = direction => `<div class="image-wrapper image-wrap-${direction}" style="width:140px;height:60px"><img width="140" height="60"></div>`;
        const html = image(side) + '<p>' + 'Text beside the first image. '.repeat(35) + '</p><p id="last">No pain no gain. ' + 'Last paragraph before the next image. '.repeat(8) + '</p>' + image(side === 'left' ? 'right' : 'left') + '<p>Text beside the second image.</p>';
        const admin = new JSDOM(`<div>${html}</div>`).window.document.querySelector('div');
        markParagraphsBeforeImages(admin);
        await page.setContent(`<style>${globalCss}\n${css}\n${editorStyles()}\n${imageCss}\nbody{margin:0}.rich-text-renderer,.ql-editor{width:900px;font-size:17px;line-height:1.5}</style><div class="rich-text-renderer blog-content">${group(html).innerHTML}</div><div class="quill-wrapper-container is-blog-editor"><div class="ql-editor">${admin.innerHTML}</div></div>`);
        const metrics = selector => page.locator(selector).evaluate(root => {
          const paragraph = root.querySelector('#last');
          const image = root.querySelectorAll('.image-wrapper')[1];
          return { margin: getComputedStyle(paragraph).marginBottom, gap: image.getBoundingClientRect().top - paragraph.getBoundingClientRect().bottom };
        });
        for (const hasSupport of [true, false]) {
          if (!hasSupport) {
            // Simulate legacy selector parsing: an unsupported :has invalidates the whole rule list.
            await page.evaluate(() => {
              const strip = sheet => {
                for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                  const rule = sheet.cssRules[i];
                  if (rule.selectorText?.includes(':has(')) sheet.deleteRule(i);
                  else if (rule.cssRules) strip(rule);
                }
              };
              [...document.styleSheets].forEach(strip);
            });
          }
          const publicLayout = await metrics('.rich-text-renderer');
          const adminLayout = await metrics('.ql-editor');
          assert.equal(publicLayout.margin, '16px', 'Margin belongs to the paragraph, not display:contents');
          assert.equal(publicLayout.margin, adminLayout.margin);
          assert.ok(publicLayout.gap >= 15.5, `Natural gap above next image: ${JSON.stringify(publicLayout)}`);
          assert.ok(Math.abs(publicLayout.gap - adminLayout.gap) < 1, `Same visual gap: ${JSON.stringify({publicLayout, adminLayout, hasSupport})}`);
        }
      }
    } finally { await browser.close(); }
  });
}
