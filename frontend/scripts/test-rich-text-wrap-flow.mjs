import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { chromium, webkit } from 'playwright';
import ts from 'typescript';
import { collectWrapTextSiblings, isWhitespaceSpacerBlock, cleanImageInlineStyle, normalizeImageLayoutMarkers, groupWrapImages } from '../src/utils/richTextWrap.mjs';

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

test('mobile wrap ends at the first spacer after text, preserving all author paragraphs', () => {
  const root = group(fixture());
  assert.equal(root.querySelectorAll('.rich-text-wrap-text > p').length, 1);
  assert.equal(root.querySelectorAll('p').length, 6);
  assert.ok(isWhitespaceSpacerBlock(root.querySelector('.rich-text-wrap-group').nextElementSibling));
});

test('next image and section title remain outside the current wrap group', () => {
  for (const boundary of ['<div class="image-wrapper"><img></div>', '<hr>', '<p class="section">Title</p>']) {
    const doc = new JSDOM(`<div class="image-wrapper"></div><p>A</p><p><br></p>${boundary}<p>B</p>`).window.document;
    const siblings = collectWrapTextSiblings(doc.querySelector('.image-wrapper'), { isSectionTitle: el => el.classList.contains('section') });
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

for (const engine of [chromium, webkit]) {
test(`${engine.name()}: desktop Enter keeps native flow; mobile only moves the wrapped section before image`, async () => {
  const source = readFileSync(new URL('../src/components/RichTextRenderer.tsx', import.meta.url), 'utf8');
  const css = source.match(/const RICH_TEXT_RENDERER_STYLES = `([\s\S]*?)`;/)?.[1];
  assert.ok(css, 'Use the actual renderer stylesheet');
  const globalCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
  const imageCss = readFileSync(new URL('../src/styles/richTextImages.css', import.meta.url), 'utf8');
  const adminCss = editorStyles();
  const browser = await engine.launch({ headless: true });
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
      await page.locator('.rich-text-renderer p').nth(1).evaluate(el => el.remove());
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
      const mobileImageBottom = await page.locator('.rich-text-renderer .image-wrapper').evaluate(el => el.getBoundingClientRect().bottom);
      const outsideTextTop = await page.locator('.rich-text-renderer p').nth(1).evaluate(el => el.getBoundingClientRect().top);
      assert.ok(outsideTextTop >= mobileImageBottom, 'The next section stays AFTER this image, not before it');
      await page.setViewportSize({ width: 1200, height: 900 });
    }
  } finally {
    await browser.close();
  }
});

}

test('spacing markers survive grouping and are recomputed after image edits', () => {
  const root = group('<div class="image-wrapper image-wrap-right"><img></div><p>First text</p><p id="last">No pain no gain</p><div class="image-wrapper image-wrap-left"><img></div><p>Next text</p>');
  const paragraph = root.querySelector('#last');
  assert.ok(paragraph.classList.contains('has-following-wrap-image'));
  assert.equal(root.querySelectorAll('.rich-text-wrap-group.has-following-wrap-image').length, 0);
  groupWrapImages(root);
  assert.equal(root.querySelectorAll('.rich-text-wrap-group').length, 2, 'Repeated normalization is idempotent');
  assert.ok(paragraph.classList.contains('has-following-wrap-image'));
  root.querySelector('.wrap-left').remove();
  normalizeImageLayoutMarkers(root);
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
        normalizeImageLayoutMarkers(admin);
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


test('leading spacers stay with wrap text; separators leave the next section between images', () => {
  for (const count of [1, 3]) {
    const blank = '<p class="ql-whitespace-preserve"><br></p>';
    const html = '<div class="image-wrapper image-wrap-right"><img></div>' + blank.repeat(count)
      + '<p id="wrap-start">Wrapped introduction.</p><p id="wrap-end">Wrapped conclusion.</p>'
      + blank.repeat(count) + '<p id="outside">A separate paragraph before the next image.</p>'
      + '<div id="next-image" class="image-wrapper" data-wrap="none"><img></div><p>After the standalone image.</p>';
    const root = group(html);
    const wrap = root.querySelector('.rich-text-wrap-group');
    assert.equal(wrap.querySelectorAll('p').length, count + 2);
    assert.equal(wrap.querySelector('.rich-text-wrap-text').lastElementChild.id, 'wrap-end');
    assert.equal(root.querySelector('#outside').parentElement, root);
    assert.equal(root.querySelector('#outside').nextElementSibling.id, 'next-image');
    assert.equal(root.querySelectorAll('p').length, count * 2 + 4, 'No blank paragraphs are deleted');
    groupWrapImages(root);
    assert.equal(root.querySelector('#outside').parentElement, root, 'Repeated normalization preserves the boundary');
  }
});


test('an explicit editor wrap exit ends the mobile group even without a blank line', () => {
  const root = group('<div class="image-wrapper image-wrap-right"><img></div><p>Wrapped text</p><p class="editor-wrap-exit-content" id="exit">Outside wrap</p>');
  assert.equal(root.querySelector('#exit').parentElement, root);
});

for (const engine of [chromium, webkit]) {
  test(`${engine.name()}: saved wrap-exit markers have the same desktop meaning in admin and public content`, async () => {
    const source = readFileSync(new URL('../src/components/RichTextRenderer.tsx', import.meta.url), 'utf8');
    const css = source.match(/const RICH_TEXT_RENDERER_STYLES = `([\s\S]*?)`;/)[1];
    const globalCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
    const imageCss = readFileSync(new URL('../src/styles/richTextImages.css', import.meta.url), 'utf8');
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: {width:1200,height:900} });
      for (const side of ['left','right']) {
        const html = `<div class="image-wrapper image-wrap-${side}" style="width:220px;height:330px"><img width="220" height="330"></div><p id="wrapped">A short wrapped paragraph.</p><p class="editor-wrap-trailing-spacer ql-whitespace-preserve ql-whitespace-spacer"><br></p><p class="editor-wrap-trailing-spacer ql-whitespace-preserve ql-whitespace-spacer"><br></p><p id="exit" class="editor-wrap-exit-content">This paragraph starts below the entire float.</p>`;
        await page.setContent(`<style>${globalCss}\n${css}\n${editorStyles()}\n${imageCss}\n.rich-text-renderer,.ql-editor{width:900px;font-size:17px;line-height:1.6}</style><div class="rich-text-renderer blog-content">${group(html).innerHTML}</div><div class="quill-wrapper-container is-blog-editor"><div class="ql-editor">${html}</div></div>`);
        const metrics = selector => page.locator(selector).evaluate(root => {
          const image = root.querySelector('.image-wrapper').getBoundingClientRect();
          const exit = root.querySelector('#exit');
          const range = document.createRange();range.selectNodeContents(exit);
          return { clear:getComputedStyle(exit).clear, gap:exit.getBoundingClientRect().top-image.bottom, firstLineWidth:range.getClientRects()[0].width, wrappedMargin:getComputedStyle(root.querySelector('#wrapped')).marginBottom, spacers:[...root.querySelectorAll('.editor-wrap-trailing-spacer')].map(el=>getComputedStyle(el).display) };
        });
        const admin=await metrics('.ql-editor');
        const user=await metrics('.rich-text-renderer');
        assert.equal(user.clear,'both');
        assert.deepEqual(user.spacers,['none','none']);
        assert.equal(user.wrappedMargin,admin.wrappedMargin,'Grouping must not erase the last wrapped paragraph margin');
        assert.equal(user.gap,admin.gap);
        assert.ok(user.gap>=16,'First line clears the image including its bottom margin');
        assert.equal(user.firstLineWidth,admin.firstLineWidth);
      }
    } finally { await browser.close(); }
  });
}


test('stale wrap spacer metadata cannot hide real text or media', () => {
  const doc = new JSDOM('<div><p class="editor-wrap-trailing-spacer">Real text</p><p class="editor-wrap-trailing-spacer"><img></p><p class="editor-wrap-trailing-spacer"><br></p></div>').window.document;
  const root = doc.querySelector('div');
  normalizeImageLayoutMarkers(root);
  const paragraphs = [...root.querySelectorAll('p')];
  assert.deepEqual(paragraphs.map(el => el.classList.contains('editor-wrap-trailing-spacer')), [false, false, true]);
});
