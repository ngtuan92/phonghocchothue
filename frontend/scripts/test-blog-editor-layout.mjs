import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import config from '../tailwind.config.js';
import ts from 'typescript';
import { chromium, webkit } from 'playwright';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const layout = read('../src/components/admin/Layout.tsx');
const quill = read('../src/views/admin/QuillWrapper.jsx');
const sources = [layout, quill, read('../src/components/admin/blog/BlogForm.jsx'), read('../src/app/admin/blog/edit/[slug]/page.tsx'), read('../src/app/blog/[slug]/page.tsx')];
const utilities = (await postcss([tailwind({ ...config, content: [{ raw: sources.join('\n'), extension: 'tsx' }] })]).process('@tailwind base;@tailwind utilities;', { from: undefined })).css;
let editorCss = '';
const ast = ts.createSourceFile('QuillWrapper.jsx', quill, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
function visit(node) { if (ts.isPropertyAssignment(node) && node.name.getText(ast) === '__html' && ts.isTemplateExpression(node.initializer))
    editorCss += node.initializer.head.text + node.initializer.templateSpans.map(span => span.literal.text).join(''); ts.forEachChild(node, visit); }
visit(ast);
const css = utilities + read('../node_modules/react-quill-new/dist/quill.snow.css') + read('../src/App.css').replace(/^@import.*$/gm, '') + editorCss;
const html = `<div id="user" class="blog-detail-viewport"><div class="w-full"><main class="main-container"><div id="user-content">Text</div></main></div></div><div id="admin"><div class="p-2"><div class="blog-edit-page w-full h-full p-2 md:p-6"><form><div class="w-full p-6 md:p-8 border"><div class="blog-content-area w-full"><div class="border"><div class="quill-wrapper-container is-blog-editor blog-desc-editor"><div class="ql-toolbar ql-snow"></div><div class="ql-container ql-snow"><div class="ql-editor"><p>Text</p></div></div></div></div></div></div></form></div></div></div>`;
for (const engine of [chromium, webkit]) {
    test(`${engine.name()}: both blog text edges align with and without a classic scrollbar`, async () => {
        const browser = await engine.launch();
        try {
            const page = await browser.newPage();
            await page.setContent(`<style>${css}\n#admin *{transition:none!important;animation:none!important}#user,#admin{position:absolute;top:0;left:0;width:100%}</style>${html}`);
            for (const width of [402, 640, 767, 768, 1024, 1385, 1440, 1710]) {
                await page.setViewportSize({ width, height: 900 });
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                for (const gutter of [0, 15, 17]) {
                    const edges = await page.evaluate(gutter => { document.documentElement.style.setProperty('--admin-scrollbar-width', gutter + 'px'); document.querySelector('#admin').style.width = `calc(100vw - ${gutter}px)`; const get = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return { left: r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight) }; }; return { user: get(document.querySelector('#user-content')), admin: get(document.querySelector('.ql-editor')) }; }, gutter);
                    assert.ok(Math.abs(edges.user.left - edges.admin.left) < 0.1, JSON.stringify({ width, gutter, edges }));
                    assert.ok(Math.abs(edges.user.right - edges.admin.right) < 0.1, JSON.stringify({ width, gutter, edges }));
                }
            }
        }
        finally {
            await browser.close();
        }
    });
}
test('actual admin layout effect refreshes scrollbar width after content loads', async () => {
    const ast = ts.createSourceFile('Layout.tsx', layout, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let effect;
    function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'React.useEffect' && node.arguments[0]?.getText(ast).includes('--admin-scrollbar-width'))
        effect = ts.transpileModule('(' + node.arguments[0].getText(ast) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText.replace(/;\s*$/, ''); ts.forEachChild(node, visit); }
    visit(ast);
    assert.ok(effect);
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        await page.setContent('<body><div style="height:100px"></div></body>');
        await page.evaluate(effect => { window.testGutter = 0; Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => innerWidth - window.testGutter }); window.cleanupEffect = new Function('setOpen', `return (${effect})()`)(() => { }); }, effect);
        await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--admin-scrollbar-width') === '0px');
        await page.evaluate(() => { window.testGutter = 17; document.body.style.paddingTop = '20px'; });
        await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--admin-scrollbar-width') === '17px', {}, { timeout: 3000 });
        await page.evaluate(() => { window.testGutter = 0; document.body.style.paddingTop = '40px'; });
        await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--admin-scrollbar-width') === '0px', {}, { timeout: 3000 });
        await page.evaluate(() => window.cleanupEffect());
    }
    finally {
        await browser.close();
    }
});
