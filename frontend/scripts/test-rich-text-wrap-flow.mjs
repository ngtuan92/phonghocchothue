import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { chromium } from 'playwright';
import ts from 'typescript';
import { collectWrapTextSiblings, isWhitespaceSpacerBlock, cleanImageInlineStyle } from '../src/utils/richTextWrap.mjs';

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

function group(html, side = 'right') {
  const doc = new JSDOM(`<div id="content">${html}</div>`).window.document;
  const root = doc.querySelector('#content');
  const image = root.querySelector('.image-wrapper');
  const siblings = collectWrapTextSiblings(image, () => false);
  const group = doc.createElement('div');
  group.className = `rich-text-wrap-group wrap-${side}`;
  const text = doc.createElement('div');
  text.className = 'rich-text-wrap-text';
  image.before(group);
  group.append(image, text);
  siblings.forEach(element => text.append(element));
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
      await page.setContent(`<style>${globalCss}\n${css}\n${adminCss}\n${imageCss}\nbody{margin:0}.rich-text-renderer,.ql-editor{width:100%;max-width:1000px;font-size:20px;line-height:1.5}</style><div class="rich-text-renderer">${group(html, side).innerHTML}</div><div class="quill-wrapper-container"><div class="ql-editor">${html}</div></div>`);
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
