
import React, { forwardRef, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Modal from "@/components/admin/Modal";
import { Button } from "@material-tailwind/react";
import { ColorPicker } from "@mantine/core";
import {
  normalizeExcessiveLeadingWhitespaceAlignment,
  normalizeResponsiveLineHeightStyles,
} from "@/utils/richTextControls";
import {
  RICH_TEXT_DELTA_MIME,
  clipboardTextMatches,
  embedRichTextDeltaInHtml,
  expandCopyRangeToLeadingWhitespace,
  extractRichTextDeltaFromHtml,
  hasSignificantHorizontalWhitespace,
  parseRichTextDelta,
  preserveDeltaSignificantWhitespace,
  preserveSignificantHorizontalWhitespace,
  selectCopyRange,
  selectClipboardSpacingSource,
  serializeRichTextDelta,
} from "@/utils/richTextClipboard.mjs";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/");

let cachedFonts = null;
let fetchPromise = null;
let lastRichTextClipboard = null;
const COLORS = [
  "no-color",
  "#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff",
  "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff",
  "#bbbbbb", "#f06666", "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff",
  "#888888", "#a10000", "#b26b00", "#b2b200", "#006100", "#0047b2", "#6b24b2",
  "#444444", "#5c0000", "#663d00", "#666600", "#003700", "#002966", "#3d1466",
  "#f1c40f", "#f39c12", "#e67e22", "#d35400", "#7f8c8d", "#34495e", "#2c3e50",
  "#ffeacb", "#ffd19a", "#ffb347", "#799f85", "#e57f7f", "#563c39", "#323232",
  "custom-color"
];

const RESPONSIVE_CONTROL_KEYS = [
  'fontSize',
  'fontSizeMobile',
  'lineHeight',
  'lineHeightMobile',
  'translateY',
  'translateYMobile',
];

const RESPONSIVE_CONTROL_CSS_VAR = {
  fontSize: '--fs-desktop',
  fontSizeMobile: '--fs-mobile',
  lineHeight: '--custom-line-height',
  lineHeightMobile: '--custom-line-height-mobile',
  translateY: '--translate-y',
  translateYMobile: '--translate-y-mobile',
};


const RESPONSIVE_CONTROL_CALLBACK_KEYS = {
  lineHeight: 'onChangeLineHeight',
  lineHeightMobile: 'onChangeLineHeightMobile',
  fontSize: 'onChangeFontSize',
  fontSizeMobile: 'onChangeFontSizeMobile',
  translateY: 'onChangeTranslateY',
  translateYMobile: 'onChangeTranslateYMobile',
};

const IMAGE_WRAP_DISPLAY = {
  left: { float: 'left', display: 'inline' },
  right: { float: 'right', display: 'inline' },
  none: { float: 'none', display: 'block' },
};

const RESPONSIVE_INLINE_FORMATS = {
  fontSize: 'fontSizeDesktop',
  fontSizeMobile: 'fontSizeMobile',
  lineHeight: 'lineHeight',
  lineHeightMobile: 'lineHeightMobile',
  translateY: 'translateY',
  translateYMobile: 'translateYMobile',
};

const normalizeImageWrapMode = (mode) => (mode === 'left' || mode === 'right' ? mode : 'none');

const setImportantStyles = (node, styles) => {
  Object.entries(styles).forEach(([property, value]) => {
    if (value === '' || value == null) {
      node.style.removeProperty(property);
      return;
    }
    node.style.setProperty(property, value, 'important');
  });
};

const applyImageWrapDisplay = (node, mode = 'none') => {
  const wrapMode = normalizeImageWrapMode(mode);
  const target = node?.tagName === 'IMG' ? node : node?.querySelector?.('img');
  if (!target) return wrapMode;
  const wrapper = target.closest?.('.image-wrapper');
  target.setAttribute('data-wrap', wrapMode);
  wrapper?.setAttribute('data-wrap', wrapMode);
  wrapper?.classList.remove('image-wrap-left', 'image-wrap-right');
  if (wrapMode === 'left' || wrapMode === 'right') {
    wrapper?.classList.add(`image-wrap-${wrapMode}`);
  }
  setImportantStyles(node, {
    ...IMAGE_WRAP_DISPLAY[wrapMode],
    'width': '',
    'max-width': '100%',
    'margin-top': wrapMode === 'none' ? '20px' : '0',
    'margin-bottom': '16px',
    'margin-left': wrapMode === 'right' ? '20px' : wrapMode === 'none' ? 'auto' : '0',
    'margin-right': wrapMode === 'left' ? '20px' : wrapMode === 'none' ? 'auto' : '0',
  });
  if (wrapper && wrapper !== node) {
    setImportantStyles(wrapper, {
      ...IMAGE_WRAP_DISPLAY[wrapMode],
      'width': '',
      'max-width': '100%',
      'margin-top': wrapMode === 'none' ? '20px' : '0',
      'margin-bottom': '16px',
      'margin-left': wrapMode === 'right' ? '20px' : wrapMode === 'none' ? 'auto' : '0',
      'margin-right': wrapMode === 'left' ? '20px' : wrapMode === 'none' ? 'auto' : '0',
    });
  }
  return wrapMode;
};

const ensureImageCaptionNode = (wrapper, caption) => {
  if (!wrapper?.querySelector) return;
  const captionText = String(caption || '').trim();
  let captionNode = wrapper.querySelector(':scope > .image-caption');

  if (!captionText) {
    captionNode?.remove();
    return;
  }

  if (!captionNode) {
    captionNode = document.createElement('div');
    captionNode.className = 'image-caption';
    captionNode.setAttribute('contenteditable', 'false');
    wrapper.appendChild(captionNode);
  }
  captionNode.textContent = captionText;
};

const createControlCallbacks = (callbacks) => Object.fromEntries(
  Object.entries(RESPONSIVE_CONTROL_CALLBACK_KEYS).map(([key, callbackName]) => [key, callbacks[callbackName]])
);

const isResponsiveControlKey = (key) => RESPONSIVE_CONTROL_KEYS.includes(key);

const isValidControlInput = (value, signed = false) => {
  const text = String(value || '').trim();
  if (!text) return true;
  if (signed && text === '-') return true;

  const pattern = signed
    ? /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:p|px)?$/i
    : /^(?:\d+(?:\.\d*)?|\.\d+)(?:p|px)?$/i;
  return pattern.test(text);
};

const preserveClipboardHtmlWhitespace = (html) => {
  if (!html || typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = String(node.textContent || '');
    const hasBlockChildren = node.parentElement?.querySelector?.(
      ':scope > p, :scope > div, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol'
    );
    if (text.trim() || !hasBlockChildren) {
      node.textContent = preserveSignificantHorizontalWhitespace(text);
    }
    node = walker.nextNode();
  }
  return doc.body.innerHTML;
};

const extractClipboardHtmlText = (html) => {
  if (!html || typeof DOMParser === 'undefined') return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blockSelector = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote';
  const leafBlocks = Array.from(doc.body.querySelectorAll(blockSelector)).filter(
    (block) => !block.querySelector(blockSelector)
  );

  if (leafBlocks.length > 0) {
    return leafBlocks.map((block) => block.textContent || '').join('\n');
  }
  return doc.body.textContent || '';
};

const restoreDeltaLeadingWhitespace = (delta, sourceText, Delta) => {
  if (!delta?.ops?.length || !sourceText) return delta;

  const lineIndents = String(sourceText).split('\n').map((line) => (
    line.match(/^[\t \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/)?.[0] || ''
  ));
  if (!lineIndents.some(Boolean)) return delta;

  const restored = new Delta();
  let lineIndex = 0;
  let atLineStart = true;
  let indentInserted = false;

  const insertIndent = (attributes) => {
    if (indentInserted) return;
    const indent = lineIndents[lineIndex] || '';
    if (indent) {
      restored.insert(preserveSignificantHorizontalWhitespace(indent), attributes);
    }
    indentInserted = true;
  };

  delta.ops.forEach((op) => {
    if (typeof op.insert !== 'string') {
      insertIndent(op.attributes);
      restored.push(op);
      atLineStart = false;
      return;
    }

    const chunks = op.insert.split('\n');
    chunks.forEach((chunk, chunkIndex) => {
      const hasNewlineAfter = chunkIndex < chunks.length - 1;
      let text = chunk;

      if (atLineStart) {
        text = text.replace(/^[\t \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/, '');
        if (text || hasNewlineAfter) insertIndent(op.attributes);
      }
      if (text) {
        restored.insert(text, op.attributes);
        atLineStart = false;
      }

      if (hasNewlineAfter) {
        restored.insert('\n', op.attributes);
        lineIndex += 1;
        atLineStart = true;
        indentInserted = false;
      }
    });
  });

  return restored;
};

const toLineHeightCssValue = (value) => {
  const text = String(value || '').trim();
  if (!text || text.startsWith("-")) return undefined;
  if (/p$/i.test(text) && !/px$/i.test(text)) return undefined;
  if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) {
    return `${text}px`;
  }
  return text;
};

const toInlineControlFormat = (key, value) => {
  const formatName = RESPONSIVE_INLINE_FORMATS[key] || key;
  if (!value) return { formatName, formatValue: false };

  const allowsNegative = key === 'translateY' || key === 'translateYMobile';
  const unitValue = key === 'lineHeight' || key === 'lineHeightMobile'
    ? toLineHeightCssValue(value)
    : toCssUnit(value, allowsNegative);
  return { formatName, formatValue: unitValue };
};

const scheduleIdleWork = (callback, timeout = 300) => {
  if (typeof window === "undefined") return 0;
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(callback, 80);
};

const cancelIdleWork = (id) => {
  if (!id || typeof window === "undefined") return;
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
};

const createModules = (fontList, hasResponsiveFontSize, showSpacingAndTranslation, hasResponsiveColor) => {
  const mediaGroup = ["link", "image"];
  if (showSpacingAndTranslation) {
    mediaGroup.push("line-height", "translate-y");
  }
  const sizeControl = hasResponsiveFontSize ? [["font-size-custom"]] : [];

  return {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: fontList }],
      ...sizeControl,
      ["bold", "italic", "underline", "strike"],
      hasResponsiveColor
        ? ["color-desktop-custom", "color-mobile-custom", { background: COLORS }]
        : [{ color: COLORS }, { background: COLORS }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      mediaGroup,
      ["clean"],
    ],
    clipboard: {
      matchers: [
        [Node.ELEMENT_NODE, (node, delta) => {
          const style = node.getAttribute('style');
          if (style && style.includes('font-family')) {
            const cleanStyle = style.replace(/font-family:\s*(&quot;|['"])?([^;'"&]+)(&quot;|['"])?/i, 'font-family: $2');
            if (cleanStyle !== style) {
              node.setAttribute('style', cleanStyle);
            }
          }
          return delta;
        }]
      ]
    },
    history: {
      delay: 700,
      maxStack: 100,
      userOnly: true
    }
  };
};

if (typeof window !== "undefined" && Quill) {
  const BlockEmbed = Quill.import("blots/block/embed");
  class CustomImageBlot extends BlockEmbed {
    static create(value) {
      const node = super.create();
      node.classList.add("image-wrapper");
      node.setAttribute("contenteditable", "false");
      const img = document.createElement("img");
      node.appendChild(img);

      if (typeof value === "string") {
        img.setAttribute("src", value);
        applyImageWrapDisplay(node);
      } else if (value && typeof value === "object") {
        img.setAttribute("src", value.src);
        if (value.alt) img.setAttribute("alt", value.alt);
        if (value.title) img.setAttribute("title", value.title);
        if (value.caption) img.setAttribute("data-caption", value.caption);
        if (value.width) {
          img.setAttribute("width", value.width);
          img.style.width = value.width.includes('%') || value.width.includes('px') ? value.width : `${value.width}px`;
        }
        if (value.borderRadius) {
          img.style.borderRadius = value.borderRadius;
          img.setAttribute("data-border-radius", value.borderRadius);
        }
        applyImageWrapDisplay(node, value.wrap);
        ensureImageCaptionNode(node, value.caption);
      }
      return node;
    }
    static formats(node) {
      const img = node.tagName === "IMG" ? node : node.querySelector("img");
      if (!img) return {};

      let width = img.getAttribute("width");
      if (!width && img.style.width) {
        width = img.style.width;
      }
      let wrap = img.getAttribute("data-wrap") || node.getAttribute("data-wrap");
      if (!wrap) {
        if (node.style.float === 'left' || img.style.float === 'left') wrap = 'left';
        else if (node.style.float === 'right' || img.style.float === 'right') wrap = 'right';
      }
      return {
        width: width,
        alt: img.getAttribute("alt"),
        title: img.getAttribute("title"),
        caption: img.getAttribute("data-caption"),
        borderRadius: img.style.borderRadius || img.getAttribute("data-border-radius"),
        wrap: wrap || 'none'
      };
    }
    static value(node) {
      const img = node.tagName === "IMG" ? node : node.querySelector("img");
      if (!img) return "";
      return {
        src: img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
        title: img.getAttribute("title") || "",
        caption: img.getAttribute("data-caption") || "",
        width: img.getAttribute("width") || img.style.width || "",
        borderRadius: img.style.borderRadius || img.getAttribute("data-border-radius") || "",
        wrap: img.getAttribute("data-wrap") || node.getAttribute("data-wrap") || "none"
      };
    }
    format(name, value) {
      const img = this.domNode.tagName === "IMG" ? this.domNode : this.domNode.querySelector("img");
      if (!img) {
        super.format(name, value);
        return;
      }

      if (name === "width") {
        img.setAttribute("width", value);
        img.style.width = value;
      } else if (name === "alt") {
        if (value) {
          img.setAttribute("alt", value);
        } else {
          img.removeAttribute("alt");
        }
      } else if (name === "title") {
        if (value) {
          img.setAttribute("title", value);
        } else {
          img.removeAttribute("title");
        }
      } else if (name === "caption") {
        if (value) {
          img.setAttribute("data-caption", value);
        } else {
          img.removeAttribute("data-caption");
        }
        ensureImageCaptionNode(this.domNode, value);
      } else if (name === "borderRadius") {
        img.style.borderRadius = value || "";
        if (value) {
          img.setAttribute("data-border-radius", value);
        } else {
          img.removeAttribute("data-border-radius");
        }
      } else if (name === "wrap") {
        applyImageWrapDisplay(this.domNode, value);
      } else {
        super.format(name, value);
      }
    }
  }
  CustomImageBlot.blotName = "image";
  CustomImageBlot.tagName = "div";
  CustomImageBlot.className = "image-wrapper";
  Quill.register(CustomImageBlot, true);

  const InlineBlot = Quill.import("blots/inline");
  class InlineCaptionBlot extends InlineBlot {
    static create(value) {
      const node = super.create(value);
      node.setAttribute("contenteditable", "false");
      return node;
    }
  }
  InlineCaptionBlot.blotName = "inline-caption";
  InlineCaptionBlot.tagName = "span";
  InlineCaptionBlot.className = "editor-inline-image-caption";
  Quill.register(InlineCaptionBlot, true);

  const Parchment = Quill.import("parchment");
  if (Parchment) {
    const AttributeAttributor = Parchment.Attributor;
    const StyleAttributor = Parchment.StyleAttributor;

    class CssVariableAttributor extends StyleAttributor {
      add(node, value) {
        if (!this.canAdd(node, value)) return false;
        node.style.setProperty(this.keyName, value);
        return true;
      }

      remove(node) {
        node.style.removeProperty(this.keyName);
        if (!node.getAttribute('style')) {
          node.removeAttribute('style');
        }
      }

      value(node) {
        let value = node.style.getPropertyValue(this.keyName);
        return this.canAdd(node, value) ? value : '';
      }
    }

    const altAttributor = new AttributeAttributor("alt", "alt", {
      scope: Parchment.Scope.INLINE
    });
    const titleAttributor = new AttributeAttributor("title", "title", {
      scope: Parchment.Scope.INLINE
    });
    const captionAttributor = new AttributeAttributor("caption", "data-caption", {
      scope: Parchment.Scope.INLINE
    });
    const wrapAttributor = new AttributeAttributor("wrap", "data-wrap", {
      scope: Parchment.Scope.INLINE
    });
    const borderRadiusAttributor = new StyleAttributor("borderRadius", "border-radius", {
      scope: Parchment.Scope.INLINE
    });
    const widthAttributor = new StyleAttributor("width", "width", {
      scope: Parchment.Scope.INLINE
    });
    const lineHeightAttributor = new CssVariableAttributor("lineHeight", "--custom-line-height", {
      scope: Parchment.Scope.INLINE
    });
    const lineHeightMobileAttributor = new CssVariableAttributor("lineHeightMobile", "--custom-line-height-mobile", {
      scope: Parchment.Scope.INLINE
    });
    const whiteSpaceAttributor = new StyleAttributor("whiteSpace", "white-space", {
      scope: Parchment.Scope.BLOCK
    });
    const overflowWrapAttributor = new StyleAttributor("overflowWrap", "overflow-wrap", {
      scope: Parchment.Scope.BLOCK
    });
    const translateYAttributor = new CssVariableAttributor("translateY", "--translate-y", {
      scope: Parchment.Scope.INLINE
    });
    const translateYMobileAttributor = new CssVariableAttributor("translateYMobile", "--translate-y-mobile", {
      scope: Parchment.Scope.INLINE
    });
    const fontSizeDesktopAttributor = new CssVariableAttributor("fontSizeDesktop", "--fs-desktop", {
      scope: Parchment.Scope.INLINE
    });
    const fontSizeMobileAttributor = new CssVariableAttributor("fontSizeMobile", "--fs-mobile", {
      scope: Parchment.Scope.INLINE
    });
    const colorMobileAttributor = new CssVariableAttributor("colorMobile", "--color-mobile", {
      scope: Parchment.Scope.INLINE
    });

    Quill.register(altAttributor, true);
    Quill.register(titleAttributor, true);
    Quill.register(captionAttributor, true);
    Quill.register(wrapAttributor, true);
    Quill.register(borderRadiusAttributor, true);
    Quill.register(widthAttributor, true);
    Quill.register(lineHeightAttributor, true);
    Quill.register(lineHeightMobileAttributor, true);
    Quill.register(whiteSpaceAttributor, true);
    Quill.register(overflowWrapAttributor, true);
    Quill.register(translateYAttributor, true);
    Quill.register(translateYMobileAttributor, true);
    Quill.register(fontSizeDesktopAttributor, true);
    Quill.register(fontSizeMobileAttributor, true);
    Quill.register(colorMobileAttributor, true);
  }


  const SizeStyle = Quill.import("attributors/style/size");
  if (SizeStyle) {
    SizeStyle.whitelist = null;
    SizeStyle.canAdd = () => true;
    Quill.register(SizeStyle, true);
  }
  const AlignStyle = Quill.import("attributors/style/align");
  if (AlignStyle) {
    Quill.register(AlignStyle, true);
  }

  const ColorStyle = Quill.import("attributors/style/color");
  if (ColorStyle) {
    Quill.register(ColorStyle, true);
  }

  const BackgroundStyle = Quill.import("attributors/style/background");
  if (BackgroundStyle) {
    Quill.register(BackgroundStyle, true);
  }

  const icons = Quill.import('ui/icons');
  if (icons) {
    icons['image-settings'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M22.7,19L24,20.3L14.6,29.7L13.3,28.4L22.7,19M7,2V4H8V2H7M11,2V4H12V2H11M15,2V4H16V2H15M19,2V4H20V2H19M5,4V28H19V18.1L21,16.1V28A2,2 0 0,1 19,30H5A2,2 0 0,1 3,28V4A2,2 0 0,1 5,2H19A2,2 0 0,1 21,4V10.1L19,12.1V4H5M20.2,13C20.3,13 20.5,13.1 20.6,13.2L21.8,14.4C22,14.6 22,15 21.8,15.2L20.8,16.2L18.8,14.2L19.8,13.2C19.9,13.1 20,13 20.2,13M18.1,14.9L20.1,16.9L14,23L12,21L18.1,14.9Z" />
      </svg>
    `;
    icons['more'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      </svg>
    `;
    icons['line-height'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M10 5h12v2H10V5zm0 6h12v2H10v-2zm0 6h12v2H10v-2zM4 4.5l-3 3h2v9H1v3h6v-3H5v-9h2l-3-3z"/>
      </svg>
    `;
    icons['translate-y'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M12 2L8 6h3v12H8l4 4 4-4h-3V6h3l-4-4z" />
      </svg>
    `;
    icons['font-size-custom'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M9 4v3h5v12h3V7h5V4H9zm-6 6v3h3v6h3v-6h3v-3H3z"/>
      </svg>
    `;
    icons['color-desktop-custom'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M5 20h14v2H5v-2zm5.7-18h2.6l5.2 15h-2.7l-1.2-3.8H9.3L8.1 17H5.5l5.2-15zm-.7 9h3.9L12 5.1 10 11z"/>
      </svg>
    `;
    icons['color-mobile-custom'] = icons['color-desktop-custom'];
  }
}

const FORMATS = [
  "header", "font", "size", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align", "link", "image", "wrap",
  "alt", "title", "caption", "borderRadius", "width", "lineHeight", "lineHeightMobile",
  "translateY", "translateYMobile", "fontSizeDesktop", "fontSizeMobile", "colorMobile", "whiteSpace", "overflowWrap"
];

const slugify = (name) => name.trim().toLowerCase().replace(/\s+/g, '-');

const DEFAULT_FONT_VALUE = "";

const mapGoogleFont = (font) => ({
  name: font.name.trim(),
  slug: slugify(font.name),
  family: font.name.trim()
});

const mapLocalFont = (font) => ({
  name: font.display_name,
  slug: font.font_family,
  family: font.font_family,
  fileUrl: resolveAssetUrl(font.file_url),
  fileType: font.file_type
});

const fetchEditorFonts = async () => {
  const googleRes = await fetch(`${URL_API}api/fonts`);
  let googleFonts = [];
  if (googleRes.ok) {
    const data = await googleRes.json();
    googleFonts = data
      .map(mapGoogleFont);
  }

  const localRes = await fetch(`${URL_API}api/fonts/local`);
  let localFonts = [];
  if (localRes.ok) {
    const result = await localRes.json();
    if (result.success && Array.isArray(result.data)) {
      localFonts = result.data
        .filter(f => f.status === 'active')
        .map(mapLocalFont);
    }
  }

  return [...googleFonts, ...localFonts].sort((a, b) => a.name.localeCompare(b.name));
};

const stripFontSizeFromStyle = (styleContent) => {
  return styleContent
    .split(';')
    .map(part => part.trim())
    .filter(part => {
      if (!part) return false;
      const lower = part.toLowerCase();
      if (lower.startsWith('--fs-desktop') || lower.startsWith('--fs-mobile')) return true;
      if (lower.startsWith('font-size')) return false;
      return !lower.startsWith('--fs');
    })
    .join('; ');
};

const stripResponsiveControlVarsFromStyle = (styleContent) => {
  return styleContent
    .split(';')
    .map(part => part.trim())
    .filter(part => {
      if (!part) return false;
      const lower = part.toLowerCase();
      return (
        !lower.startsWith('--fs-desktop') &&
        !lower.startsWith('--fs-mobile') &&
        !lower.startsWith('--custom-line-height') &&
        !lower.startsWith('--custom-line-height-mobile') &&
        !lower.startsWith('--translate-y') &&
        !lower.startsWith('--translate-y-mobile')
      );
    })
    .join('; ');
};

const normalizeApiUrl = (url) => (url || "").replace(/\/$/, "");

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${normalizeApiUrl(URL_API)}/${url.replace(/^\//, "")}`;
};

const getFontFormat = (type) => {
  const cleanType = String(type || "").toLowerCase();
  if (cleanType === "ttf") return "truetype";
  if (cleanType === "otf") return "opentype";
  return cleanType || "truetype";
};

const escapeCssString = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const escapeCssAttributeValue = (value) => {
  const text = String(value || "");
  if (typeof window !== "undefined" && window.CSS?.escape) {
    return window.CSS.escape(text);
  }
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const isMobileAdminViewport = () => (
  typeof window !== "undefined" &&
  window.matchMedia?.("(max-width: 767px)")?.matches
);

const getMobileAdminChromeBottom = () => {
  if (typeof document === "undefined" || !isMobileAdminViewport()) return 0;
  const navbar = document.querySelector('nav.sticky.top-0');
  const rect = navbar?.getBoundingClientRect?.();
  if (!rect || rect.bottom <= 0) return 0;
  return rect.bottom;
};

const isControlPopupInputActive = () => {
  if (typeof document === "undefined") return false;
  const activeElement = document.activeElement;
  return Boolean(activeElement?.closest?.('.ql-font-size-popup, .ql-line-height-popup, .ql-translate-y-popup'));
};

const cleanFontSizeStyle = (styleContent) => styleContent
  .split(';')
  .map(part => part.trim())
  .filter(part => {
    if (!part) return false;
    const lower = part.toLowerCase();
    if (lower.startsWith('--fs-desktop') || lower.startsWith('--fs-mobile')) return true;
    if (/^--fs(?:-[\w-]+)?\s*:/i.test(part)) return false;
    return !/^font-size\s*:/i.test(part);
  })
  .join('; ');

const cleanStyleForSave = cleanFontSizeStyle;
const cleanStyleForEdit = cleanFontSizeStyle;

const removeEmptyStyledSpans = (html, { preserveWhitespaceOnly = false } = {}) => {
  if (!html || typeof html !== "string") return html;
  if (preserveWhitespaceOnly) return html;
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<span\b(?=[^>]*\bstyle=)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/span>/gi, "");
  }

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll("span[style]").forEach((span) => {
    const text = (span.textContent || "").replace(/\u00a0/g, "").trim();
    const hasMedia = span.querySelector("img, video, iframe, svg");
    if (!text && !hasMedia) {
      span.remove();
    }
  });

  root.querySelectorAll("span:not([style]):not([class])").forEach((span) => {
    span.replaceWith(...Array.from(span.childNodes));
  });

  return root.innerHTML;
};

const syncListItemFontSizeFromChildren = (root) => {
  if (!root?.querySelectorAll) return 0;

  let changedCount = 0;

  root.querySelectorAll('li').forEach((li) => {
    const sizedElement = li.querySelector?.('[style*="font-size"], [style*="--fs-desktop"], [style*="--fs-mobile"]')
      || (li.matches?.('[style*="font-size"], [style*="--fs-desktop"], [style*="--fs-mobile"]') ? li : null);

    if (!sizedElement?.style) return;

    const fontSize = sizedElement.style.getPropertyValue('font-size');
    const desktopFontSize = sizedElement.style.getPropertyValue('--fs-desktop');
    const mobileFontSize = sizedElement.style.getPropertyValue('--fs-mobile');

    if (fontSize && li.style.getPropertyValue('font-size') !== fontSize) {
      li.style.setProperty('font-size', fontSize);
      changedCount += 1;
    }
    if (desktopFontSize && li.style.getPropertyValue('--fs-desktop') !== desktopFontSize) {
      li.style.setProperty('--fs-desktop', desktopFontSize);
      changedCount += 1;
    }
    if (mobileFontSize && li.style.getPropertyValue('--fs-mobile') !== mobileFontSize) {
      li.style.setProperty('--fs-mobile', mobileFontSize);
      changedCount += 1;
    }
  });

  return changedCount;
};

const selectionTouchesList = (quill, selection) => {
  if (!quill || !selection || selection.length <= 0) return false;

  try {
    const startLeaf = quill.getLeaf(selection.index)?.[0]?.domNode;
    const endLeaf = quill.getLeaf(Math.max(selection.index + selection.length - 1, selection.index))?.[0]?.domNode;
    return Boolean(
      startLeaf?.parentElement?.closest?.("li") ||
      endLeaf?.parentElement?.closest?.("li")
    );
  } catch {
    return false;
  }
};


const stripEditorCaptionArtifacts = (html) => {
  if (!html || typeof html !== "string") return html;
  return html
    .replace(/<([a-z0-9-]+)\b[^>]*class=["'][^"']*\beditor-inline-image-caption(?:-preview)?\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<([a-z0-9-]+)\b[^>]*class=["'][^"']*\beditor-image-caption\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, "");
};

const unwrapRichTextControlsForEdit = (html) => {
  if (!html || typeof html !== "string" || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  const controlsRoot = root?.children.length === 1 &&
    root.firstElementChild?.matches("[data-rich-text-controls]")
      ? root.firstElementChild
      : null;
  if (!root || !controlsRoot) return html;

  controlsRoot.replaceWith(...Array.from(controlsRoot.childNodes));
  return root.innerHTML;
};

const isEmptyQuillParagraph = (node) => {
  if (!node || node.tagName !== 'P') return false;
  if (node.querySelector('img, video, iframe, svg, table, ul, ol')) return false;
  const text = (node.textContent || '').replace(/\u00a0/g, '').trim();
  if (text) return false;
  return Array.from(node.childNodes).every((child) => (
    child.nodeType === Node.TEXT_NODE
      ? !String(child.textContent || '').replace(/\u00a0/g, '').trim()
      : child.nodeType === Node.ELEMENT_NODE && child.tagName === 'BR'
  ));
};

const removeEmptyQuillParagraphElements = (root) => {
  if (!root?.querySelectorAll) return;
  const children = Array.from(root.children || []);
  let trailingIndex = children.length - 1;

  while (trailingIndex >= 0 && isEmptyQuillParagraph(children[trailingIndex])) {
    children[trailingIndex].remove();
    trailingIndex -= 1;
  }

  let emptyRun = [];
  Array.from(root.children || []).forEach((child) => {
    if (isEmptyQuillParagraph(child)) {
      emptyRun.push(child);
      if (emptyRun.length > 1) {
        child.remove();
      }
      return;
    }
    emptyRun = [];
  });
};

const removeEmptyQuillParagraphs = (html, { preserveWhitespaceOnly = false } = {}) => {
  if (!html || typeof html !== "string") return html;
  if (preserveWhitespaceOnly) return html;
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  }

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;
  removeEmptyQuillParagraphElements(root);
  return root.innerHTML;
};

const normalizeWhitespaceOnlyBlocksForQuill = (html) => {
  if (!html || typeof html !== "string" || typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  const normalizeTextNodes = (node) => {
    Array.from(node.childNodes || []).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent = String(child.textContent || "").replace(/\u00a0/g, " ");
        return;
      }
      normalizeTextNodes(child);
    });
  };

  root.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6").forEach((block) => {
    if (block.querySelector("img, video, iframe, svg, canvas, table")) return;

    const text = (block.textContent || "").replace(/\u00a0/g, " ");
    const hasOnlyWhitespaceText = text.length > 0 && text.trim() === "";
    const hasOnlyBreaks = text.length === 0 && /^(?:\s|<br\s*\/?>|&nbsp;)*$/i.test(block.innerHTML || "");
    if (!hasOnlyWhitespaceText && !hasOnlyBreaks) return;

    block.classList.add("ql-whitespace-preserve");
    block.style.whiteSpace = "break-spaces";
    block.style.overflowWrap = "break-word";

    if (hasOnlyBreaks) {
      block.textContent = " ";
    } else {
      normalizeTextNodes(block);
    }
  });

  return root.innerHTML;
};

const preserveSignificantInlineWhitespaceForQuill = (html) => {
  if (!html || typeof html !== "string" || typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current);
    current = walker.nextNode();
  }

  textNodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style")) return;

    const text = String(node.textContent || "").replace(/\u00a0/g, " ");
    node.textContent = text.replace(/(^ +| {2,}| +$)/g, (spaces) => "\u00a0".repeat(spaces.length));
  });

  root.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li").forEach((block) => {
    const hasSignificantWhitespace = /\u00a0| {2,}/.test(block.textContent || "");
    if (block.style.overflowWrap === "anywhere") {
      block.style.overflowWrap = "break-word";
    }
    if (!hasSignificantWhitespace) return;
    block.style.whiteSpace = "break-spaces";
    block.style.overflowWrap = "break-word";
  });

  return root.innerHTML;
};

const findImageBlot = (img) => {
  if (!img) return null;
  return Quill.find(img) || Quill.find(img.closest?.('.image-wrapper'));
};

const normalizeImageWrappersForEdit = (html) => {
  if (!html || typeof html !== "string" || typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll('.image-wrapper').forEach((wrapper) => {
    const img = wrapper.querySelector('img');
    if (!img) return;
    const captionNode = wrapper.querySelector(':scope > .image-caption');
    const caption = img.getAttribute('data-caption') || captionNode?.textContent || '';
    ensureImageCaptionNode(wrapper, caption);
    const wrap = normalizeImageWrapMode(img.getAttribute('data-wrap') || wrapper.getAttribute('data-wrap'));
    wrapper.setAttribute('data-wrap', wrap);
    wrapper.classList.remove('image-wrap-left', 'image-wrap-right');
    if (wrap === 'left' || wrap === 'right') wrapper.classList.add(`image-wrap-${wrap}`);
    setImportantStyles(wrapper, {
      ...IMAGE_WRAP_DISPLAY[wrap],
      'width': '',
      'max-width': '100%',
      'margin-top': wrap === 'none' ? '12px' : '0',
      'margin-bottom': '10px',
      'margin-left': wrap === 'right' ? '20px' : wrap === 'none' ? 'auto' : '0',
      'margin-right': wrap === 'left' ? '20px' : wrap === 'none' ? 'auto' : '0',
    });
  });

  root.querySelectorAll('img').forEach((img) => {
    if (img.closest('.image-wrapper')) return;
    const wrapper = doc.createElement('div');
    wrapper.className = 'image-wrapper';
    const wrap = normalizeImageWrapMode(img.getAttribute('data-wrap'));
    wrapper.setAttribute('data-wrap', wrap);
    if (wrap === 'left' || wrap === 'right') wrapper.classList.add(`image-wrap-${wrap}`);
    img.replaceWith(wrapper);
    wrapper.appendChild(img);
    applyImageWrapDisplay(wrapper, wrap);
    ensureImageCaptionNode(wrapper, img.getAttribute('data-caption') || '');
  });

  return root.innerHTML;
};

const removeEmptyStyledSpanElements = (root, { preserveWhitespaceOnly = false } = {}) => {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("span[style]").forEach((span) => {
    const rawText = String(span.textContent || "").replace(/\u00a0/g, " ");
    const containsIntentionalWhitespace = rawText.length > 0 && rawText.trim() === "";
    const hasMedia = span.querySelector("img, video, iframe, svg");
    if (!rawText.trim() && !hasMedia && !(preserveWhitespaceOnly && containsIntentionalWhitespace)) {
      span.remove();
    }
  });
};

const toCssUnit = (value, allowNegative = false) => {
  const text = String(value || '').trim();
  if (!text) return undefined;
  if (/p$/i.test(text) && !/px$/i.test(text)) return undefined;
  const numberPattern = allowNegative
    ? /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
    : /^(?:\d+(?:\.\d+)?|\.\d+)$/;
  return numberPattern.test(text) ? `${text}px` : text;
};

const QuillWrapper = forwardRef(({
  lineHeight,
  lineHeightMobile,
  onChangeLineHeight,
  onChangeLineHeightMobile,
  fontSizeMobile,
  onChangeFontSizeMobile,
  fontSize,
  onChangeFontSize,
  translateY,
  translateYMobile,
  onChangeTranslateY,
  onChangeTranslateYMobile,
  disableImageWrap = false,
  toolbarTop = "0px",
  isSticky = false,
  maxHeight = "none",
  minHeight = "120px",
  isBlogEditor = false,
  className = "",
  editorClassName = "",
  hasResponsiveFontSize,
  hasResponsiveColor = false,
  inlineSelectionControls = false,
  commitOnBlurOnly = false,
  onDraftChange,
  onControlDraftChange,
  ...props
}, ref) => {
  const isSimpleTextField =
    className.includes('describe-phone') ||
    className.includes('describe-quote-text') ||
    className.includes('seo-h1-main');
  const shouldPreserveHeroInlineWhitespace =
    className.includes('describe-phone') ||
    className.includes('describe-quote-text') ||
    className.includes('hero-phone-text') ||
    className.includes('hero-slogan-text');
  const preserveWhitespaceOnlyBlocks =
    className.includes('blog-desc-editor') ||
    className.includes('room-desc-editor') ||
    className.includes('room-summary-editor');
  const shouldNormalizeAdminContentWhitespace =
    className.includes('blog-title-editor') ||
    className.includes('blog-excerpt-editor') ||
    className.includes('room-name-editor');
  const preserveInlineWhitespace =
    preserveWhitespaceOnlyBlocks ||
    shouldNormalizeAdminContentWhitespace ||
    shouldPreserveHeroInlineWhitespace;
  const shouldNormalizeExcessiveIndent = false;
  const canUseInlineSelectionControls = !!inlineSelectionControls;
  const canUseMobileSelectionToolbar = false;
  const hasOnChangeFontSize = !!onChangeFontSize;
  const hasOnChangeFontSizeMobile = !!onChangeFontSizeMobile;
  const hasResponsive = hasResponsiveFontSize !== undefined
    ? hasResponsiveFontSize
    : (hasOnChangeFontSize && hasOnChangeFontSizeMobile);
  const editorRef = useRef(null);
  const [editorInstanceVersion, setEditorInstanceVersion] = useState(0);
  const handleEditorRef = useCallback((instance) => {
    if (editorRef.current === instance) return;
    editorRef.current = instance;
    if (instance) {
      setEditorInstanceVersion((version) => version + 1);
    }
  }, []);
  const containerRef = useRef(null);
  const getQuillEditor = useCallback(() => {
    try {
      return editorRef.current?.getEditor?.() || null;
    } catch {
      return null;
    }
  }, []);
  const [isReady, setIsReady] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(false);
  const [showSpacingPopup, setShowSpacingPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const [fontSizePopupPosition, setFontSizePopupPosition] = useState({ top: 0, left: 0 });
  const [showTranslatePopup, setShowTranslatePopup] = useState(false);
  const [translatePopupPosition, setTranslatePopupPosition] = useState({ top: 0, left: 0 });
  const [responsiveColorPopup, setResponsiveColorPopup] = useState({
    visible: false,
    top: 0,
    left: 0,
    value: '#000000',
    device: 'desktop',
    applyColor: null,
  });
  const [mobileSelectionToolbar, setMobileSelectionToolbar] = useState({ visible: false, top: 0, left: 0 });
  const [controlDrafts, setControlDrafts] = useState({});
  const [selectionControlDrafts, setSelectionControlDrafts] = useState({});
  const controlDraftsRef = useRef({});
  const selectionControlDraftsRef = useRef({});
  const popupInputValuesRef = useRef({});
  const [popupValueVersion, setPopupValueVersion] = useState(0);
  const activeControlInputKeyRef = useRef(null);
  const [modules, setModules] = useState(null);
  const [dynamicFonts, setDynamicFonts] = useState([]);
  const fontSearchValueRef = useRef("");
  const fontSearchDropdownOpenRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const selectedImageRef = useRef(null);
  const selectedImageSrcRef = useRef("");
  const [imageWrapMode, setImageWrapMode] = useState('none');
  const [resizerRect, setResizerRect] = useState(null);
  const resizerOverlayRef = useRef(null);
  const resizeDragRef = useRef(false);
  const imageResizeSessionRef = useRef(null);
  const resolveImageElement = useCallback((node) => {
    if (!node) return null;
    if (node.tagName === 'IMG') return node;
    return node.querySelector?.('img') || null;
  }, []);
  const savedSelectionRef = useRef(null);
  const lastHighlightSelectionRef = useRef(null);
  const pendingCopySelectionRef = useRef(null);
  const controlSelectionRef = useRef(null);
  const typingSelectionRef = useRef(null);
  const lastRelativeContentRef = useRef("");
  const localEditorHtmlRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const isSyncingExternalValueRef = useRef(false);
  const lastSyncedExternalValueRef = useRef(null);
  const suppressControlInputBlurRef = useRef(false);
  const controlPopupOpenRef = useRef(false);
  const controlPopupVisibleRef = useRef({
    fontSize: false,
    lineHeight: false,
    translateY: false,
  });
  const controlButtonRectRef = useRef({});
  const controlPopupAnchorRef = useRef({});
  const mobileFontSizeButtonRef = useRef(null);
  const mobileLineHeightButtonRef = useRef(null);
  const mobileTranslateButtonRef = useRef(null);
  const toolbarScrollSnapshotRef = useRef(null);
  const emitCurrentContentForSaveRef = useRef(null);
  const idleContentCleanupRef = useRef(0);
  const listSizeSyncFrameRef = useRef(0);
  const toolbarHandlerRefs = useRef({});
  const clipboardAttachRetryRef = useRef(0);
  const pendingNewParagraphFontRef = useRef(null);
  const lastActiveFormatsRef = useRef({});


  const onChangeTimeoutRef = useRef(null);
  const onChangeRef = useRef(props.onChange);
  const onDraftChangeRef = useRef(onDraftChange);
  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  const normalizeUnsignedControlValue = useCallback((key, value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (key !== 'translateY' && key !== 'translateYMobile' && /^0+(?:\.0+)?(?:px)?$/i.test(text)) {
      return "";
    }
    return text;
  }, []);
  const getPopupInputValue = useCallback((key, value) => {
    if (Object.prototype.hasOwnProperty.call(popupInputValuesRef.current, key)) {
      return popupInputValuesRef.current[key];
    }
    if (Object.prototype.hasOwnProperty.call(selectionControlDraftsRef.current, key)) {
      return normalizeUnsignedControlValue(key, selectionControlDraftsRef.current[key]);
    }
    if (commitOnBlurOnly && Object.prototype.hasOwnProperty.call(controlDraftsRef.current, key)) {
      return normalizeUnsignedControlValue(key, controlDraftsRef.current[key]);
    }
    return normalizeUnsignedControlValue(key, value);
  }, [commitOnBlurOnly, normalizeUnsignedControlValue, popupValueVersion]);

  const clearPopupInputValues = useCallback(() => {
    popupInputValuesRef.current = {};
    setPopupValueVersion((prev) => prev + 1);
  }, []);

  const focusWithoutScroll = useCallback((target) => {
    if (!target || typeof window === 'undefined') return;

    const root = target.root || getQuillEditor()?.root || target;
    const scrollParents = [window];
    let current = root instanceof HTMLElement ? root : null;

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (
        (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) ||
        (/(auto|scroll|overlay)/.test(style.overflowX) && current.scrollWidth > current.clientWidth)
      ) {
        scrollParents.push(current);
      }
      current = current.parentElement;
    }

    const positions = scrollParents.map((element) => (
      element === window
        ? { element, top: window.scrollY, left: window.scrollX }
        : { element, top: element.scrollTop, left: element.scrollLeft }
    ));

    try {
      if (root instanceof HTMLElement) {
        root.focus({ preventScroll: true });
      } else if (typeof target.focus === 'function') {
        target.focus();
      }
    } catch {
      try {
        target.focus?.();
      } catch { /* ignore */ }
    }

    const restore = () => {
      positions.forEach(({ element, top, left }) => {
        if (element === window) {
          window.scrollTo(left, top);
        } else {
          element.scrollTop = top;
          element.scrollLeft = left;
        }
      });
    };

    restore();
    window.requestAnimationFrame(restore);
  }, []);

  const getClampedControlPopupPosition = useCallback((button, popupWidth = 220, cacheKey = "", popupHeight = 220) => {
    if (typeof window === 'undefined') {
      return { top: 0, left: 12, width: popupWidth };
    }

    const nextRect = button?.getBoundingClientRect?.();
    const isUsableRect = nextRect && (nextRect.width > 0 || nextRect.height > 0);
    if (isUsableRect && cacheKey) {
      controlButtonRectRef.current[cacheKey] = {
        top: nextRect.top,
        right: nextRect.right,
        bottom: nextRect.bottom,
        left: nextRect.left,
        width: nextRect.width,
        height: nextRect.height,
      };
    }

    const rect = isUsableRect ? nextRect : controlButtonRectRef.current[cacheKey];
    const isMobilePopup = isMobileAdminViewport();
    const mobileMetrics = {
      fontSize: { width: 194, height: 164 },
      lineHeight: { width: 190, height: 202 },
      translateY: { width: 190, height: 202 },
    };
    const popupMetrics = isMobilePopup && mobileMetrics[cacheKey]
      ? mobileMetrics[cacheKey]
      : { width: popupWidth, height: popupHeight };
    const viewport = window.visualViewport;
    const viewportLeft = safeNumber(viewport?.offsetLeft, 0);
    const viewportTop = safeNumber(viewport?.offsetTop, 0);
    const viewportWidth = safeNumber(viewport?.width, window.innerWidth || document.documentElement.clientWidth || popupMetrics.width);
    const viewportHeight = safeNumber(viewport?.height, window.innerHeight || document.documentElement.clientHeight || popupMetrics.height);
    const gutter = isMobilePopup ? 8 : 12;
    const width = Math.min(popupMetrics.width, Math.max(isMobilePopup ? 176 : 160, viewportWidth - gutter * 2));
    const height = Math.min(popupMetrics.height, Math.max(120, viewportHeight - gutter * 2));
    const minLeft = viewportLeft + gutter;
    const maxLeft = viewportLeft + viewportWidth - width - gutter;
    const preferredLeft = isMobilePopup
      ? safeNumber((rect?.left || 0) + ((rect?.width || 0) / 2) - (width / 2), minLeft)
      : safeNumber(rect?.left, minLeft);
    const minTop = Math.max(viewportTop + gutter, getMobileAdminChromeBottom() + (isMobilePopup ? 8 : 0));
    const viewportBottom = viewportTop + viewportHeight - gutter;
    const belowTop = safeNumber((rect?.bottom || 0) + viewportTop + 5);
    const aboveTop = safeNumber((rect?.top || 0) + viewportTop - height - 5);
    const maxTop = Math.max(minTop, viewportBottom - height);
    const preferredTop = belowTop + height <= viewportBottom
      ? belowTop
      : Math.max(aboveTop, minTop);

    return {
      top: Math.max(minTop, Math.min(preferredTop, maxTop)),
      left: Math.max(minLeft, Math.min(preferredLeft, maxLeft)),
      width,
    };
  }, []);

  const updateMobileSelectionToolbarPosition = useCallback((rangeOverride = null) => {
    if (!isMobileAdminViewport() || !canUseMobileSelectionToolbar) {
      setMobileSelectionToolbar((prev) => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }

    const quill = getQuillEditor();
    const selection = rangeOverride || controlSelectionRef.current || lastHighlightSelectionRef.current || savedSelectionRef.current;
    if (!quill?.root || !selection || selection.length <= 0) {
      setMobileSelectionToolbar((prev) => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }

    try {
      const bounds = quill.getBounds(selection.index, selection.length);
      const editorRect = quill.root.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = safeNumber(viewport?.offsetLeft, 0);
      const viewportTop = safeNumber(viewport?.offsetTop, 0);
      const viewportWidth = safeNumber(viewport?.width, window.innerWidth || document.documentElement.clientWidth || 360);
      const viewportHeight = safeNumber(viewport?.height, window.innerHeight || document.documentElement.clientHeight || 640);
      const toolbarWidth = 154;
      const toolbarHeight = 42;
      const gutter = 8;
      const safeTop = Math.max(viewportTop + gutter, getMobileAdminChromeBottom() + gutter);
      const viewportBottom = viewportTop + viewportHeight - gutter;
      const selectionTop = editorRect.top + safeNumber(bounds.top) + viewportTop;
      const selectionBottom = selectionTop + safeNumber(bounds.height, 24);
      const selectionCenter = editorRect.left + safeNumber(bounds.left) + (safeNumber(bounds.width, 1) / 2) + viewportLeft;
      const preferredTop = selectionBottom + toolbarHeight + gutter <= viewportBottom
        ? selectionBottom + gutter
        : selectionTop - toolbarHeight - gutter;
      const top = Math.max(safeTop, Math.min(preferredTop, viewportBottom - toolbarHeight));
      const left = Math.max(
        viewportLeft + gutter,
        Math.min(selectionCenter - (toolbarWidth / 2), viewportLeft + viewportWidth - toolbarWidth - gutter)
      );

      setMobileSelectionToolbar({ visible: true, top, left });
    } catch {
      setMobileSelectionToolbar((prev) => prev.visible ? { ...prev, visible: false } : prev);
    }
  }, [canUseMobileSelectionToolbar, getQuillEditor]);

  const getMobileSelectionPopupPosition = useCallback((popupWidth = 200, popupHeight = 220) => {
    if (!isMobileAdminViewport()) return null;

    const quill = getQuillEditor();
    const selection = controlSelectionRef.current || lastHighlightSelectionRef.current || savedSelectionRef.current;
    if (!quill?.root || !selection || selection.length <= 0) return null;

    try {
      const bounds = quill.getBounds(selection.index, selection.length);
      const editorRect = quill.root.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = safeNumber(viewport?.offsetLeft, 0);
      const viewportTop = safeNumber(viewport?.offsetTop, 0);
      const viewportWidth = safeNumber(viewport?.width, window.innerWidth || document.documentElement.clientWidth || popupWidth);
      const viewportHeight = safeNumber(viewport?.height, window.innerHeight || document.documentElement.clientHeight || popupHeight);
      const gutter = 8;
      const width = Math.min(popupWidth, Math.max(176, viewportWidth - gutter * 2));
      const height = Math.min(popupHeight, Math.max(120, viewportHeight - gutter * 2));
      const minLeft = viewportLeft + gutter;
      const maxLeft = viewportLeft + viewportWidth - width - gutter;
      const safeTop = Math.max(viewportTop + gutter, getMobileAdminChromeBottom() + gutter);
      const viewportBottom = viewportTop + viewportHeight - gutter;
      const selectionTop = editorRect.top + safeNumber(bounds.top) + viewportTop;
      const selectionBottom = selectionTop + safeNumber(bounds.height, 24);
      const selectionCenter = editorRect.left + safeNumber(bounds.left) + (safeNumber(bounds.width, 1) / 2) + viewportLeft;
      const topAboveSelection = selectionTop - height - gutter;
      const topBelowSelection = selectionBottom + gutter;
      const preferredTop = topAboveSelection >= safeTop
        ? topAboveSelection
        : topBelowSelection;
      const maxTop = Math.max(safeTop, viewportBottom - height);

      return {
        top: Math.max(safeTop, Math.min(preferredTop, maxTop)),
        left: Math.max(minLeft, Math.min(selectionCenter - (width / 2), maxLeft)),
        width,
      };
    } catch {
      return null;
    }
  }, [getQuillEditor]);

  const preserveScrollAround = useCallback((root, action) => {
    if (typeof window === 'undefined') {
      action?.();
      return;
    }

    const scrollParents = [window];
    let current = root instanceof HTMLElement ? root : null;

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (
        (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) ||
        (/(auto|scroll|overlay)/.test(style.overflowX) && current.scrollWidth > current.clientWidth)
      ) {
        scrollParents.push(current);
      }
      current = current.parentElement;
    }

    const positions = scrollParents.map((element) => (
      element === window
        ? { element, top: window.scrollY, left: window.scrollX }
        : { element, top: element.scrollTop, left: element.scrollLeft }
    ));

    const restore = () => {
      positions.forEach(({ element, top, left }) => {
        if (element === window) {
          window.scrollTo(left, top);
        } else {
          element.scrollTop = top;
          element.scrollLeft = left;
        }
      });
    };

    try {
      action?.();
    } finally {
      restore();
      window.requestAnimationFrame(restore);
      window.setTimeout(restore, 50);
      window.setTimeout(restore, 150);
      window.setTimeout(restore, 300);
    }
  }, []);

  const takeEditorScrollSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const root = getQuillEditor()?.root || containerRef.current?.querySelector?.('.ql-editor') || containerRef.current;
    const elements = [window];
    let current = root instanceof HTMLElement ? root : null;

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (
        (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) ||
        (/(auto|scroll|overlay)/.test(style.overflowX) && current.scrollWidth > current.clientWidth)
      ) {
        elements.push(current);
      }
      current = current.parentElement;
    }

    return elements.map((element) => (
      element === window
        ? { element, top: window.scrollY, left: window.scrollX }
        : { element, top: element.scrollTop, left: element.scrollLeft }
    ));
  }, [getQuillEditor]);

  const restoreEditorScrollSnapshot = useCallback((snapshot = toolbarScrollSnapshotRef.current) => {
    if (!snapshot || typeof window === 'undefined') return;

    const restore = () => {
      snapshot.forEach(({ element, top, left }) => {
        if (element === window) {
          window.scrollTo(left, top);
        } else if (element?.isConnected !== false) {
          element.scrollTop = top;
          element.scrollLeft = left;
        }
      });
    };

    restore();
    window.requestAnimationFrame(restore);
    window.setTimeout(restore, 50);
    window.setTimeout(restore, 150);
    window.setTimeout(restore, 300);
  }, []);

  const setSelectionWithoutScroll = useCallback((quill, ...args) => {
    if (!quill) return;
    preserveScrollAround(quill.root, () => {
      quill.setSelection(...args);
    });
  }, [getQuillEditor, preserveScrollAround]);

  const preserveAdminScrollDuring = useCallback((action) => {
    const root = containerRef.current;
    preserveScrollAround(root, action);

    if (typeof window === 'undefined' || !root) return;

    const scrollParents = [window];
    let current = root.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (
        (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) ||
        (/(auto|scroll|overlay)/.test(style.overflowX) && current.scrollWidth > current.clientWidth)
      ) {
        scrollParents.push(current);
      }
      current = current.parentElement;
    }

    const positions = scrollParents.map((element) => (
      element === window
        ? { element, top: window.scrollY, left: window.scrollX }
        : { element, top: element.scrollTop, left: element.scrollLeft }
    ));
    const restore = () => {
      positions.forEach(({ element, top, left }) => {
        if (element === window) {
          window.scrollTo(left, top);
        } else {
          element.scrollTop = top;
          element.scrollLeft = left;
        }
      });
    };

    window.requestAnimationFrame(restore);
    window.setTimeout(restore, 50);
    window.setTimeout(restore, 150);
  }, [preserveScrollAround]);

  const preserveEditorScrollDuring = useCallback((action) => {
    const snapshot = toolbarScrollSnapshotRef.current || takeEditorScrollSnapshot();
    const quillRoot = getQuillEditor()?.root;
    const editorRoot = quillRoot || containerRef.current?.querySelector?.('.ql-editor') || containerRef.current;
    preserveScrollAround(editorRoot, action);
    restoreEditorScrollSnapshot(snapshot);
  }, [getQuillEditor, preserveScrollAround, restoreEditorScrollSnapshot, takeEditorScrollSnapshot]);

  const keepPopupInteractionStable = useCallback((event) => {
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    preserveAdminScrollDuring();
  }, [preserveAdminScrollDuring]);

  const focusControlInput = useCallback((key) => {
    activeControlInputKeyRef.current = key;
    preserveAdminScrollDuring();
  }, [preserveAdminScrollDuring]);

  const getCurrentControlSelection = useCallback((rangeOverride = null) => {
    const quill = getQuillEditor();
    const preferred = rangeOverride || controlSelectionRef.current || savedSelectionRef.current || typingSelectionRef.current || quill?.getSelection?.();
    if (!preferred) return null;
    if (preferred.length > 0) return { ...preferred };

    const fallback = controlSelectionRef.current?.length > 0
      ? controlSelectionRef.current
      : lastHighlightSelectionRef.current?.length > 0
        ? lastHighlightSelectionRef.current
        : savedSelectionRef.current?.length > 0
          ? savedSelectionRef.current
          : typingSelectionRef.current?.length > 0
            ? typingSelectionRef.current
            : null;

    return fallback ? { ...fallback } : { ...preferred };
  }, [getQuillEditor]);

  const applyInlineControlToSelection = useCallback((key, value, options = {}) => {
    const { updateDraft = true } = options;
    if (
      !canUseInlineSelectionControls ||
      !isResponsiveControlKey(key)
    ) return false;

    const quill = getQuillEditor();
    const selection = getCurrentControlSelection();
    if (!quill || !selection || selection.length <= 0) return false;

    const normalized = normalizeUnsignedControlValue(key, value);
    const { formatName, formatValue } = toInlineControlFormat(key, normalized);
    const needsListSync = selectionTouchesList(quill, selection);

    const hasFocus = quill.hasFocus();

    preserveEditorScrollDuring(() => {
      if (hasFocus) {
        setSelectionWithoutScroll(quill, selection.index, selection.length, 'silent');
      }
      if (key === 'fontSize' || key === 'fontSizeMobile') {
        quill.formatText(selection.index, selection.length, 'size', false, 'user');
      }
      quill.formatText(selection.index, selection.length, formatName, formatValue || false, 'user');
      if (needsListSync) {
        syncListItemFontSizeFromChildren(quill.root);
      }
      if (hasFocus) {
        setSelectionWithoutScroll(quill, selection.index, selection.length, 'silent');
      }
      localEditorHtmlRef.current = quill.root.innerHTML;
      isUserEditingRef.current = true;
    });

    if (idleContentCleanupRef.current) {
      cancelIdleWork(idleContentCleanupRef.current);
    }
    idleContentCleanupRef.current = scheduleIdleWork(() => {
      idleContentCleanupRef.current = 0;
      try {
        removeEmptyStyledSpanElements(quill.root, {
          preserveWhitespaceOnly: preserveInlineWhitespace,
        });
        if (!needsListSync) {
          syncListItemFontSizeFromChildren(quill.root);
        }
      } catch { /* ignore */ }
    });

    if (updateDraft) {
      selectionControlDraftsRef.current = {
        ...selectionControlDraftsRef.current,
        [key]: normalized,
      };
      setSelectionControlDrafts((prev) => ({ ...prev, [key]: normalized }));
    }
    return true;
  }, [canUseInlineSelectionControls, getCurrentControlSelection, getQuillEditor, normalizeUnsignedControlValue, preserveEditorScrollDuring, preserveInlineWhitespace, setSelectionWithoutScroll]);

  const syncSelectionControlsFromFormat = useCallback((rangeOverride = null) => {
    const quill = getQuillEditor();
    if (!quill) return;

    const selection = getCurrentControlSelection(rangeOverride);
    if (!selection) return;

    const format = canUseInlineSelectionControls ? quill.getFormat(selection) : {};

    const desktopSize = format.fontSizeDesktop
      ? String(format.fontSizeDesktop).replace('px', '')
      : String(fontSize || "").replace('px', '');
    const mobileSize = format.fontSizeMobile
      ? String(format.fontSizeMobile).replace('px', '')
      : String(fontSizeMobile || "").replace('px', '');
    const lh = format.lineHeight
      ? String(format.lineHeight).replace('px', '')
      : String(lineHeight || "").replace('px', '');
    const lhMobile = format.lineHeightMobile
      ? String(format.lineHeightMobile).replace('px', '')
      : String(lineHeightMobile || "").replace('px', '');
    const translateYVal = format.translateY
      ? String(format.translateY).replace('px', '')
      : String(translateY || "").replace('px', '');
    const translateYMobileVal = format.translateYMobile
      ? String(format.translateYMobile).replace('px', '')
      : String(translateYMobile || "").replace('px', '');

    const nextDrafts = {
      fontSize: desktopSize,
      fontSizeMobile: mobileSize,
      lineHeight: lh,
      lineHeightMobile: lhMobile,
      translateY: translateYVal,
      translateYMobile: translateYMobileVal,
    };

    // Update refs (this is synchronous and does NOT trigger component re-renders!)
    Object.keys(nextDrafts).forEach(key => {
      if (activeControlInputKeyRef.current === key) return;
      popupInputValuesRef.current[key] = nextDrafts[key];
    });
    setPopupValueVersion((prev) => prev + 1);

    const container = containerRef.current;
    if (container) {
      const fontSizeInputs = container.querySelectorAll('.ql-font-size-popup input');
      if (fontSizeInputs.length >= 2) {
        if (document.activeElement !== fontSizeInputs[0]) {
          fontSizeInputs[0].value = desktopSize;
        }
        if (document.activeElement !== fontSizeInputs[1]) {
          fontSizeInputs[1].value = mobileSize;
        }
      }

      const spacingInputs = container.querySelectorAll('.ql-line-height-popup input');
      if (spacingInputs.length >= 2) {
        if (document.activeElement !== spacingInputs[0]) {
          spacingInputs[0].value = lh;
        }
        if (document.activeElement !== spacingInputs[1]) {
          spacingInputs[1].value = lhMobile;
        }
      }

      const translateYInputs = container.querySelectorAll('.ql-translate-y-popup input');
      if (translateYInputs.length >= 2) {
        if (document.activeElement !== translateYInputs[0]) {
          translateYInputs[0].value = translateYVal;
        }
        if (document.activeElement !== translateYInputs[1]) {
          translateYMobileVal && (translateYInputs[1].value = translateYMobileVal);
        }
      }
    }
  }, [
    getCurrentControlSelection,
    getQuillEditor,
    canUseInlineSelectionControls,
    fontSize,
    fontSizeMobile,
    lineHeight,
    lineHeightMobile,
    translateY,
    translateYMobile
  ]);
  toolbarHandlerRefs.current.syncSelectionControlsFromFormat = syncSelectionControlsFromFormat;

  const applyPreviewControlToContainer = useCallback((key, value) => {
    const root = containerRef.current;
    if (!root) return;
    const cssVar = RESPONSIVE_CONTROL_CSS_VAR[key];
    if (!cssVar) return;

    if (value === "" || value == null) {
      root.style.removeProperty(cssVar);
      return;
    }

    const cssValue = key === 'lineHeight' || key === 'lineHeightMobile'
      ? toLineHeightCssValue(value)
      : toCssUnit(value, key.includes('translateY'));
    if (cssValue) {
      root.style.setProperty(cssVar, cssValue);
    }
  }, []);

  const updateControlDraftValue = useCallback((key, value, signed = false, inputElement = null) => {
    if (!isValidControlInput(value, signed)) return;

    const nextValue = normalizeUnsignedControlValue(key, value);
    if (commitOnBlurOnly && hasResponsive && isResponsiveControlKey(key)) {
      popupInputValuesRef.current[key] = nextValue;
      const selection = getCurrentControlSelection();
      const isInline =
        canUseInlineSelectionControls &&
        selection &&
        selection.length > 0;

      if (isInline) {
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          [key]: nextValue,
        };
        setSelectionControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
        applyInlineControlToSelection(key, nextValue);
        emitCurrentContentForSaveRef.current?.();
      } else {
        controlDraftsRef.current = {
          ...controlDraftsRef.current,
          [key]: nextValue,
        };
        applyPreviewControlToContainer(key, nextValue);
        setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      }

      setPopupValueVersion((prev) => prev + 1);
      return;
    }

    if (hasResponsive && isResponsiveControlKey(key)) {
      popupInputValuesRef.current[key] = nextValue;
      setPopupValueVersion((prev) => prev + 1);

      const shouldApplyPreview = nextValue !== "";

      const selection = getCurrentControlSelection();
      const isInline =
        canUseInlineSelectionControls &&
        selection &&
        selection.length > 0;

      if (isInline) {
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          [key]: nextValue,
        };
        if (shouldApplyPreview) {
          applyInlineControlToSelection(key, nextValue);
          preserveEditorScrollDuring(() => {
            emitCurrentContentForSaveRef.current?.(true);
          });
        }
      } else {
        controlDraftsRef.current = {
          ...controlDraftsRef.current,
          [key]: nextValue,
        };
        onControlDraftChange?.(key, nextValue);
        preserveEditorScrollDuring(() => {
          applyPreviewControlToContainer(key, nextValue);
          emitCurrentContentForSaveRef.current?.(true);
        });
        setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      }

      if (inputElement) {
        setTimeout(() => {
          if (document.activeElement !== inputElement) {
            try {
              inputElement.focus({ preventScroll: true });
            } catch { /* ignore */ }
          }
        }, 0);
      }
      return;
    }

    if (commitOnBlurOnly) {
      controlDraftsRef.current = {
        ...controlDraftsRef.current,
        [key]: nextValue,
      };
      popupInputValuesRef.current[key] = nextValue;
      setPopupValueVersion((prev) => prev + 1);
      setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      onControlDraftChange?.(key, nextValue);
      if (isResponsiveControlKey(key)) {
        applyPreviewControlToContainer(key, nextValue);
      }
      return;
    }

    const callbacks = createControlCallbacks({
      onChangeLineHeight,
      onChangeLineHeightMobile,
      onChangeFontSize,
      onChangeFontSizeMobile,
      onChangeTranslateY,
      onChangeTranslateYMobile,
    });
    callbacks[key]?.(nextValue);
  }, [
    commitOnBlurOnly,
    canUseInlineSelectionControls,
    hasResponsive,
    normalizeUnsignedControlValue,
    applyInlineControlToSelection,
    applyPreviewControlToContainer,
    getCurrentControlSelection,
    getQuillEditor,
    preserveEditorScrollDuring,
    onChangeFontSize,
    onChangeFontSizeMobile,
    onChangeLineHeight,
    onChangeLineHeightMobile,
    onChangeTranslateY,
    onChangeTranslateYMobile,
    onControlDraftChange,
  ]);

  const updateControlValue = useCallback((key, value, onChange, signed = false) => {
    if (!isValidControlInput(value, signed)) return;

    const nextValue = normalizeUnsignedControlValue(key, value);
    if (commitOnBlurOnly && hasResponsive && isResponsiveControlKey(key)) {
      popupInputValuesRef.current[key] = nextValue;
      const selection = getCurrentControlSelection();
      const isInline =
        canUseInlineSelectionControls &&
        selection &&
        selection.length > 0;

      if (isInline) {
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          [key]: nextValue,
        };
        setSelectionControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
        applyInlineControlToSelection(key, nextValue);
        emitCurrentContentForSaveRef.current?.();
      } else {
        controlDraftsRef.current = {
          ...controlDraftsRef.current,
          [key]: nextValue,
        };
        applyPreviewControlToContainer(key, nextValue);
        setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      }

      setPopupValueVersion((prev) => prev + 1);
      return;
    }

    if (hasResponsive && isResponsiveControlKey(key)) {
      const responsiveCallbacks = createControlCallbacks({
        onChangeLineHeight,
        onChangeLineHeightMobile,
        onChangeFontSize,
        onChangeFontSizeMobile,
        onChangeTranslateY,
        onChangeTranslateYMobile,
      });

      const appliedInline = applyInlineControlToSelection(key, value);

      popupInputValuesRef.current[key] = nextValue;

      if (appliedInline) {
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          [key]: nextValue,
        };
      } else {
        controlDraftsRef.current = {
          ...controlDraftsRef.current,
          [key]: nextValue,
        };
        applyPreviewControlToContainer(key, nextValue);
        setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      }

      preserveEditorScrollDuring(() => {
        emitCurrentContentForSaveRef.current?.(true);
      });

      if (!commitOnBlurOnly && responsiveCallbacks[key]) {
        responsiveCallbacks[key](nextValue);
      }
      return;
    }

    if (commitOnBlurOnly) {
      setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      onControlDraftChange?.(key, nextValue);
      return;
    }

    onChange?.(nextValue);
  }, [
    applyInlineControlToSelection,
    applyPreviewControlToContainer,
    commitOnBlurOnly,
    canUseInlineSelectionControls,
    disableImageWrap,
    getCurrentControlSelection,
    hasResponsive,
    normalizeUnsignedControlValue,
    preserveEditorScrollDuring,
    onChangeFontSize,
    onChangeFontSizeMobile,
    onChangeLineHeight,
    onChangeLineHeightMobile,
    onChangeTranslateY,
    onChangeTranslateYMobile,
    onControlDraftChange,
  ]);

  const commitControlDrafts = useCallback(() => {
    const callbacks = createControlCallbacks({
      onChangeLineHeight,
      onChangeLineHeightMobile,
      onChangeFontSize,
      onChangeFontSizeMobile,
      onChangeTranslateY,
      onChangeTranslateYMobile,
    });

    const selectionDraftEntries = Object.entries(selectionControlDraftsRef.current);
    selectionDraftEntries.forEach(([key, value]) => {
      applyInlineControlToSelection(key, value, { updateDraft: false });
    });
    if (selectionDraftEntries.length > 0) {
      setSelectionControlDrafts({});
      selectionControlDraftsRef.current = {};
      setPopupValueVersion((prev) => prev + 1);
    }
    if (!commitOnBlurOnly) return;

    const controlDraftEntries = Object.entries(controlDraftsRef.current);
    controlDraftEntries.forEach(([key, value]) => {
      callbacks[key]?.(normalizeUnsignedControlValue(key, value));
    });
    if (controlDraftEntries.length > 0) {
      controlDraftsRef.current = {};
      setControlDrafts({});
    }
  }, [
    commitOnBlurOnly,
    applyInlineControlToSelection,
    onChangeLineHeight,
    onChangeLineHeightMobile,
    onChangeFontSize,
    onChangeFontSizeMobile,
    onChangeTranslateY,
    onChangeTranslateYMobile,
    normalizeUnsignedControlValue,
  ]);
  toolbarHandlerRefs.current.commitControlDrafts = commitControlDrafts;

  const applyAllPreviewControlStyles = useCallback(() => {
    const selection = controlSelectionRef.current || savedSelectionRef.current || getQuillEditor()?.getSelection();
    const isInline = selection && selection.length > 0;

    Object.entries(selectionControlDraftsRef.current).forEach(([key, value]) => {
      if (!isInline) {
        applyPreviewControlToContainer(key, value);
      }
    });
    Object.entries(controlDraftsRef.current).forEach(([key, value]) => {
      applyPreviewControlToContainer(key, value);
    });
  }, [applyPreviewControlToContainer, getQuillEditor]);

  useEffect(() => {
    if (!showFontSizePopup && !showSpacingPopup && !showTranslatePopup) return;
    applyAllPreviewControlStyles();
  }, [showFontSizePopup, showSpacingPopup, showTranslatePopup, applyAllPreviewControlStyles]);

  const keepPopupInputKeyInInput = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const handleControlInputBlur = useCallback((event) => {
    if (suppressControlInputBlurRef.current) return;
    const nextFocus = event?.relatedTarget;
    if (
      nextFocus instanceof HTMLElement &&
      nextFocus.closest?.('.ql-font-size-popup, .ql-line-height-popup, .ql-translate-y-popup')
    ) {
      return;
    }
    commitControlDrafts();
    activeControlInputKeyRef.current = null;
  }, [commitControlDrafts]);

  const commitControlInput = useCallback((restoreFocus = false) => {
    commitControlDrafts();
    activeControlInputKeyRef.current = null;

    if (restoreFocus) {
      const quill = getQuillEditor();
      const selection = controlSelectionRef.current || savedSelectionRef.current;
      if (quill && selection) {
        preserveEditorScrollDuring(() => {
          focusWithoutScroll(quill);
          setSelectionWithoutScroll(quill, selection.index, selection.length, 'silent');
        });
      }
    }

  }, [
    commitControlDrafts,
    getQuillEditor,
    preserveEditorScrollDuring,
    focusWithoutScroll,
    setSelectionWithoutScroll
  ]);

  const hasOpenControlPopup = useCallback(() => (
    controlPopupOpenRef.current ||
    controlPopupVisibleRef.current.fontSize ||
    controlPopupVisibleRef.current.lineHeight ||
    controlPopupVisibleRef.current.translateY
  ), []);

  const closeAllToolbarPickers = useCallback(() => {
    const toolbar = containerRef.current?.querySelector('.ql-toolbar');
    if (!toolbar) return;
    toolbar.querySelectorAll('.ql-picker.ql-expanded').forEach((picker) => {
      picker.classList.remove('ql-expanded');
      picker.querySelector('.ql-picker-label')?.setAttribute('aria-expanded', 'false');
      picker.querySelector('.ql-picker-options')?.setAttribute('aria-hidden', 'true');
    });
    toolbar.classList.remove('ql-toolbar-expanded');
  }, []);

  const closeControlPopups = useCallback(() => {
    if (!hasOpenControlPopup()) return;

    commitControlInput();
    controlPopupOpenRef.current = false;
    controlPopupVisibleRef.current = {
      fontSize: false,
      lineHeight: false,
      translateY: false,
    };
    setShowFontSizePopup(false);
    setShowSpacingPopup(false);
    setShowTranslatePopup(false);
    clearPopupInputValues();
    containerRef.current?.querySelector('.ql-toolbar')?.classList.remove('ql-control-popup-open');
  }, [clearPopupInputValues, commitControlInput, hasOpenControlPopup]);

  const isCustomControlTarget = useCallback((target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest?.(
      '.ql-font-size-custom, .ql-line-height, .ql-translate-y, .ql-font-size-popup, .ql-line-height-popup, .ql-translate-y-popup, #quill-custom-color-picker, #quill-custom-bg-picker'
    ));
  }, []);

  useEffect(() => {
    if (!showFontSizePopup && !showSpacingPopup && !showTranslatePopup) return;

    const closeWhenChangingToolbarTool = (event) => {
      if (isCustomControlTarget(event.target)) return;
      const toolbar = containerRef.current?.querySelector('.ql-toolbar');
      if (toolbar?.contains(event.target)) return;
      closeControlPopups();
    };

    document.addEventListener('pointerdown', closeWhenChangingToolbarTool, true);
    document.addEventListener('mousedown', closeWhenChangingToolbarTool, true);

    return () => {
      document.removeEventListener('pointerdown', closeWhenChangingToolbarTool, true);
      document.removeEventListener('mousedown', closeWhenChangingToolbarTool, true);
    };
  }, [
    closeControlPopups,
    isCustomControlTarget,
    showFontSizePopup,
    showSpacingPopup,
    showTranslatePopup,
  ]);

  const clearMobileNativeSelectionOverlay = useCallback((selection = null) => {
    if (!isMobileAdminViewport()) return;

    const preservedSelection = selection?.length > 0
      ? { ...selection }
      : controlSelectionRef.current?.length > 0
        ? { ...controlSelectionRef.current }
        : lastHighlightSelectionRef.current?.length > 0
          ? { ...lastHighlightSelectionRef.current }
          : savedSelectionRef.current?.length > 0
            ? { ...savedSelectionRef.current }
            : null;

    if (preservedSelection) {
      controlSelectionRef.current = preservedSelection;
      savedSelectionRef.current = preservedSelection;
      lastHighlightSelectionRef.current = preservedSelection;
    }

    const clear = () => {
      try {
        window.getSelection?.()?.removeAllRanges?.();
      } catch { /* ignore */ }
      try {
        getQuillEditor()?.setSelection?.(null, 'silent');
      } catch { /* ignore */ }
    };

    clear();
    window.requestAnimationFrame(clear);
    window.setTimeout(clear, 60);
  }, [getQuillEditor]);

  const getImageWrapMode = useCallback(normalizeImageWrapMode, []);

  const applyImageWrapDom = useCallback((img, mode) => {
    const wrapMode = getImageWrapMode(mode);
    const wrapper = img.closest?.('.image-wrapper');
    img.setAttribute('data-wrap', wrapMode);
    wrapper?.setAttribute('data-wrap', wrapMode);
    wrapper?.classList.remove('image-wrap-left', 'image-wrap-right');
    if (wrapMode === 'left' || wrapMode === 'right') {
      wrapper?.classList.add(`image-wrap-${wrapMode}`);
    }
    const styleTarget = wrapper || img;
    styleTarget.style.setProperty('float', wrapMode === 'left' ? 'left' : wrapMode === 'right' ? 'right' : 'none', 'important');
    styleTarget.style.setProperty('display', wrapMode === 'none' ? 'block' : 'inline-block', 'important');
    styleTarget.style.setProperty('margin-top', wrapMode === 'none' ? '20px' : '0', 'important');
    styleTarget.style.setProperty('margin-bottom', wrapMode === 'none' ? '16px' : '16px', 'important');
    styleTarget.style.setProperty('margin-left', wrapMode === 'right' ? '20px' : wrapMode === 'none' ? 'auto' : '0', 'important');
    styleTarget.style.setProperty('margin-right', wrapMode === 'left' ? '20px' : wrapMode === 'none' ? 'auto' : '0', 'important');
    styleTarget.style.setProperty('max-width', '100%', 'important');
    img.style.setProperty('display', 'block', 'important');
    img.style.setProperty('margin-top', '0', 'important');
    img.style.setProperty('margin-bottom', '0', 'important');
    img.style.setProperty('margin-left', wrapMode === 'none' ? 'auto' : '0', 'important');
    img.style.setProperty('margin-right', wrapMode === 'none' ? 'auto' : '0', 'important');
    img.style.setProperty('max-width', '100%', 'important');
    img.style.setProperty('height', 'auto', 'important');
    ensureImageCaptionNode(wrapper, img.getAttribute('data-caption') || '');
    return wrapMode;
  }, [getImageWrapMode]);

  const rememberSelectedImage = useCallback((img) => {
    const nextImage = resolveImageElement(img);
    const nextSrc = nextImage?.getAttribute('src') || "";
    const nextWrap = nextImage?.getAttribute('data-wrap') || 'none';

    selectedImageRef.current = nextImage;
    selectedImageSrcRef.current = nextSrc;
    setSelectedImage((prev) => (prev === nextImage ? prev : nextImage));
    setImageWrapMode((prev) => (prev === nextWrap ? prev : nextWrap));
  }, [resolveImageElement]);

  const enterImageEditMode = useCallback((img, quill) => {
    rememberSelectedImage(img);
    if (!quill) return;
    try {
      quill.setSelection(null, 'silent');
      quill.blur();
    } catch { /* ignore */ }

  }, [rememberSelectedImage]);

  const getActiveImage = useCallback(() => {
    const editor = containerRef.current?.querySelector('.ql-editor');
    const current = resolveImageElement(selectedImageRef.current);
    if (current && editor?.contains(current) && current.isConnected) return current;

    const src = selectedImageSrcRef.current;
    if (src && editor) {
      const bySrc = Array.from(editor.querySelectorAll('img')).find((img) => img.getAttribute('src') === src);
      if (bySrc) {
        rememberSelectedImage(bySrc);
        return bySrc;
      }
    }

    return null;
  }, [rememberSelectedImage, resolveImageElement]);

  const syncCustomFontSizes = useCallback(() => {
    const imgContainer = containerRef.current;
    if (!imgContainer) return;
    const elements = imgContainer.querySelectorAll('.ql-editor [style*="--fs"]');
    elements.forEach(el => {
      el.style.removeProperty('--fs');
    });
  }, []);

  const cleanEmptyEditorParagraphs = useCallback(() => {
    const editor = containerRef.current?.querySelector('.ql-editor');
    if (!editor) return;
    removeEmptyQuillParagraphElements(editor);
  }, []);

  const syncImageCaptionBlots = useCallback(() => {
    const editor = containerRef.current?.querySelector('.ql-editor');
    if (!editor) return;

    editor.querySelectorAll('.editor-inline-image-caption, .editor-inline-image-caption-preview').forEach((el) => el.remove());
    editor.querySelectorAll('img').forEach((img) => {
      const wrapper = img.closest('.image-wrapper');
      if (!wrapper) return;
      ensureImageCaptionNode(wrapper, img.getAttribute('data-caption') || '');
    });
  }, []);
  const getVisibleImageRect = useCallback((imgRect, editorRect) => {
    if (!editorRect) {
      return {
        top: imgRect.top,
        left: imgRect.left,
        width: imgRect.width,
        height: imgRect.height
      };
    }

    const top = Math.max(imgRect.top, editorRect.top);
    const left = Math.max(imgRect.left, editorRect.left);
    const right = Math.min(imgRect.right, editorRect.right);
    const bottom = Math.min(imgRect.bottom, editorRect.bottom);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    if (width <= 1 || height <= 1) return null;
    return { top, left, width, height };
  }, []);

  const positionResizerDirectly = useCallback(() => {
    const img = resolveImageElement(selectedImageRef.current);
    const resizer = resizerOverlayRef.current;
    if (img && resizer && img.isConnected) {
      try {
        const imgRect = img.getBoundingClientRect();
        const width = Math.max(0, imgRect.width);
        const height = Math.max(0, imgRect.height);

        resizer.style.top = `${imgRect.top}px`;
        resizer.style.left = `${imgRect.left}px`;
        resizer.style.width = `${width}px`;
        resizer.style.height = `${height}px`;

        const editor = containerRef.current?.querySelector('.ql-editor');
        if (editor) {
          const editorRect = editor.getBoundingClientRect();
          const isOutside = imgRect.bottom < editorRect.top || imgRect.top > editorRect.bottom || width === 0 || height === 0;
          const visibleRect = getVisibleImageRect(imgRect, editorRect);
          if (isOutside || !visibleRect) {
            resizer.style.display = 'none';
          } else {
            resizer.style.top = `${visibleRect.top}px`;
            resizer.style.left = `${visibleRect.left}px`;
            resizer.style.width = `${visibleRect.width}px`;
            resizer.style.height = `${visibleRect.height}px`;
            resizer.style.display = 'block';
          }
        } else {
          resizer.style.display = width === 0 || height === 0 ? 'none' : 'block';
        }
      } catch { /* ignore */ }
    }
  }, [getVisibleImageRect, resolveImageElement]);

  const syncSelectedImageRect = useCallback(() => {
    let img = resolveImageElement(selectedImageRef.current);
    const container = containerRef.current;
    if (!img || !container) {
      setResizerRect((prev) => (prev === null ? prev : null));
      return;
    }

    if (!img.isConnected) {
      const src = img.getAttribute('src');
      const editor = container.querySelector('.ql-editor');
      const nextImg = src && editor
        ? Array.from(editor.querySelectorAll('img')).find(i => i.getAttribute('src') === src)
        : null;
      if (nextImg) {
        img = nextImg;
        selectedImageRef.current = nextImg;
        selectedImageSrcRef.current = nextImg.getAttribute('src') || "";
      }
    }

    if (!img.isConnected) {
      setResizerRect((prev) => (prev === null ? prev : null));
      return;
    }

    try {
      const imgRect = img.getBoundingClientRect();
      const editor = container.querySelector('.ql-editor');
      const editorRect = editor?.getBoundingClientRect();
      const isOutside = editorRect && (imgRect.bottom < editorRect.top || imgRect.top > editorRect.bottom);
      const visibleRect = getVisibleImageRect(imgRect, editorRect);

      if (isOutside || !visibleRect || imgRect.width === 0 || imgRect.height === 0) {
        setResizerRect((prev) => (prev === null ? prev : null));
      } else {
        const nextRect = {
          top: visibleRect.top,
          left: visibleRect.left,
          width: visibleRect.width,
          height: visibleRect.height
        };
        setResizerRect((prev) => (
          prev &&
            Math.abs(prev.top - nextRect.top) < 0.5 &&
            Math.abs(prev.left - nextRect.left) < 0.5 &&
            Math.abs(prev.width - nextRect.width) < 0.5 &&
            Math.abs(prev.height - nextRect.height) < 0.5
            ? prev
            : nextRect
        ));
      }
    } catch {
      setResizerRect((prev) => (prev === null ? prev : null));
    }
  }, [getVisibleImageRect, resolveImageElement]);

  const resolveFontFromDomNode = useCallback((node) => {
    if (!node) return null;
    const target = node.nodeType === 1 ? node : node.parentElement;
    if (!target) return null;

    const el = target.closest?.('[class*="ql-font-"], [style*="font-family"]') ||
               target.querySelector?.('[class*="ql-font-"], [style*="font-family"]');
    if (!el) return null;

    if (el.classList) {
      const cls = Array.from(el.classList).find(c => c.startsWith('ql-font-'));
      if (cls) return cls.replace('ql-font-', '');
    }

    const fontFamily = el.style?.fontFamily || el.getAttribute?.('style');
    if (fontFamily) {
      const match = typeof fontFamily === 'string' && fontFamily.includes(':')
        ? fontFamily.match(/font-family\s*:\s*([^;]+)/i)?.[1]
        : fontFamily;
      if (match) {
        const cleanVal = match.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
        const cleanSlug = cleanVal.replace(/\s+/g, '-');
        if (cleanVal === 'inter' || cleanVal === 'macdinh') return 'macdinh';

        const fontList = dynamicFonts.length > 0 ? dynamicFonts : (cachedFonts || []);
        const matched = fontList.find(f =>
          f.slug.toLowerCase() === cleanVal ||
          f.slug.toLowerCase() === cleanSlug ||
          (f.name && slugify(f.name) === cleanVal) ||
          (f.name && slugify(f.name) === cleanSlug) ||
          (f.family && slugify(f.family) === cleanVal) ||
          (f.family && slugify(f.family) === cleanSlug) ||
          (f.name && f.name.toLowerCase() === cleanVal) ||
          (f.family && f.family.toLowerCase() === cleanVal)
        );
        if (matched) return matched.slug;
        return cleanSlug;
      }
    }
    return null;
  }, [dynamicFonts]);

  const updateSizePickerLabel = useCallback((rangeOverride = null) => {
    const quill = getQuillEditor();
    if (!quill || !containerRef.current) return;

    let format = {};
    let selection = null;
    try {
      const hasRangeOverride = rangeOverride && typeof rangeOverride.index === 'number';
      selection = hasRangeOverride ? rangeOverride : (quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current);
      if (!selection && quill.getLength() > 0) {
        selection = { index: 0, length: 0 };
      }
      if (disableImageWrap && selection?.length === 0 && quill.getLength() > 1) {
        selection = { index: 0, length: Math.max(quill.getLength() - 1, 0) };
      }
      format = selection ? quill.getFormat(selection) : {};
    } catch { /* ignore */ }

    const size = format.size;
    let font = format.font;
    if (!font && pendingNewParagraphFontRef.current) {
      font = pendingNewParagraphFontRef.current;
    }
    if (!font && selection && typeof selection.index === 'number') {
      try {
        const [currentLine] = quill.getLine(selection.index);
        if (currentLine) {
          font = resolveFontFromDomNode(currentLine.domNode);
          if (!font && currentLine.prev) {
            font = resolveFontFromDomNode(currentLine.prev.domNode);
          }
          if (!font && currentLine.next) {
            font = resolveFontFromDomNode(currentLine.next.domNode);
          }
        }
      } catch { /* ignore */ }
    }
    if (!font && selection && typeof selection.index === 'number' && selection.index > 0) {
      for (let i = selection.index - 1; i >= Math.max(0, selection.index - 100); i--) {
        try {
          const fmt = quill.getFormat(i, 1);
          if (fmt && fmt.font && fmt.font !== 'macdinh') {
            font = fmt.font;
            break;
          }
        } catch { /* ignore */ }
      }
    }
    if (!font && lastActiveFormatsRef.current?.font && lastActiveFormatsRef.current.font !== 'macdinh') {
      font = lastActiveFormatsRef.current.font;
    }
    if (disableImageWrap && !font) {
      const fontNode = quill.root.querySelector('[style*="font-family"]');
      font = resolveFontFromDomNode(fontNode) || DEFAULT_FONT_VALUE;
    }
    const container = containerRef.current;
    if (!container) return;

    if (font && font !== 'macdinh') {
      const activeFontSlug = Array.isArray(font) ? font[0] : font;
      lastActiveFormatsRef.current = { ...lastActiveFormatsRef.current, font: activeFontSlug };
    }

    const fontPickers = container.querySelectorAll('.ql-font.ql-picker');
    fontPickers.forEach(picker => {
      const label = picker.querySelector('.ql-picker-label');
      const select = picker.querySelector('select.ql-font');
      if (!label) return;

      const rawFontVal = Array.isArray(font) ? font[0] : font;
      const fontVal = rawFontVal && rawFontVal !== 'macdinh' ? rawFontVal : DEFAULT_FONT_VALUE;
      const selectedItem = picker.querySelector(`.ql-picker-item${fontVal ? `[data-value="${escapeCssAttributeValue(fontVal)}"]` : ':not([data-value])'}`);

      picker.querySelectorAll('.ql-picker-item.ql-selected').forEach((item) => {
        item.classList.remove('ql-selected');
        item.removeAttribute('aria-selected');
      });

      if (selectedItem) {
        selectedItem.classList.add('ql-selected');
        selectedItem.setAttribute('aria-selected', 'true');
      }

      if (fontVal) {
        label.setAttribute('data-value', fontVal);
        select?.querySelectorAll('option').forEach((option) => {
          option.selected = option.value === fontVal;
        });
      } else {
        label.removeAttribute('data-value');
        select?.querySelectorAll('option').forEach((option) => {
          option.selected = option.value === DEFAULT_FONT_VALUE;
        });
      }
    });

    setPopupValueVersion((prev) => prev + 1);

    const sizePickers = container.querySelectorAll('.ql-size.ql-picker');
    sizePickers.forEach(picker => {
      const label = picker.querySelector('.ql-picker-label');
      if (!label) return;

      const dropdownInput = picker.querySelector('.custom-size-dropdown-input');

      if (size) {
        if (Array.isArray(size)) {
          label.setAttribute('data-value', '');
          label.setAttribute('data-display-value', '');
          if (dropdownInput && document.activeElement !== dropdownInput) {
            dropdownInput.value = '';
          }
        } else if (typeof size === 'string') {
          const cleanSize = size.replace('px', '');
          label.setAttribute('data-value', size);
          label.setAttribute('data-display-value', cleanSize);
          if (dropdownInput && document.activeElement !== dropdownInput) {
            dropdownInput.value = cleanSize;
          }
        }
      } else {
        label.removeAttribute('data-value');
        label.removeAttribute('data-display-value');
        if (dropdownInput && document.activeElement !== dropdownInput) {
          dropdownInput.value = '';
        }
      }
    });
  }, [disableImageWrap, dynamicFonts, getQuillEditor]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const quill = getQuillEditor();
    if (!quill) return;

    // Keep highlight selection when clicking toolbar.
    const container = containerRef.current;
    const handleMousedown = (e) => {
      const toolbar = container.querySelector('.ql-toolbar');
      if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) {
        // Do not block inputs/textareas inside toolbar.
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const isPickerTarget = e.target instanceof Element && Boolean(e.target.closest?.('.ql-picker'));

        // Allow scrolling dropdown lists when dragging their scrollbar.
        const isScrollbarClick = e.target.scrollHeight > e.target.clientHeight && e.offsetX > e.target.clientWidth;
        if (isScrollbarClick) return;

        const quillInstance = getQuillEditor();
        if (quillInstance) {
          const sel = quillInstance.getSelection();
          if (sel) {
            savedSelectionRef.current = sel;
            if (sel.length > 0) {
              lastHighlightSelectionRef.current = sel;
            }
          }
        }
        if (hasOpenControlPopup() && !isCustomControlTarget(e.target)) {
          if (isPickerTarget) {
            // Quill opens its picker from the label's native mousedown. Commit
            // and unmount the custom popup only after that handler has run.
            window.setTimeout(closeControlPopups, 0);
          } else {
            closeControlPopups();
          }
        }
        if (isPickerTarget) return;
        // Prevent editor from losing focus when clicking toolbar.
        e.preventDefault();
      }
    };

    const handleMouseup = (e) => {
      const toolbar = container.querySelector('.ql-toolbar');
      if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.target instanceof Element && e.target.closest?.('.ql-picker')) return;
        if (isMobileAdminViewport()) return;

        const quillInstance = getQuillEditor();
        if (quillInstance) {
          const saved = savedSelectionRef.current;
          if (saved) {
            // Wait for Quill to apply the format before restoring selection.
            setTimeout(() => {
              try {
                preserveAdminScrollDuring(() => {
                  setSelectionWithoutScroll(quillInstance, saved.index, saved.length, 'silent');
                });
              } catch { /* ignore */ }
            }, 0);
          }
        }
      }
    };

    container.addEventListener('mousedown', handleMousedown, true);
    container.addEventListener('mouseup', handleMouseup, true);

    // Patch toolbar update to maintain format display even when editor is blurred/unfocused
    const toolbar = quill.getModule('toolbar');
    if (toolbar && !toolbar.__patched) {
      const originalUpdate = toolbar.update.bind(toolbar);
      toolbar.update = function (range) {
        if (range == null && quill.getLength() > 0) {
          range = { index: 0, length: 0 };
        }
        originalUpdate(range);
      };
      toolbar.__patched = true;

      quill.on('text-change', () => {
        if (!quill.hasFocus()) {
          setTimeout(() => {
            try {
              toolbar.update(null);
            } catch { /* ignore */ }
          }, 10);
        }
      });
    }

    let scrollEndTimer = 0;
    const hideResizerDuringScroll = () => {
      const resizer = resizerOverlayRef.current;
      if (resizer) {
        resizer.style.display = 'none';
      }
    };
    const syncResizerAfterScroll = () => {
      try {
        if (!quill.root.querySelector('img')) return;
        window.requestAnimationFrame(() => {
          syncSelectedImageRect();
          positionResizerDirectly();
        });
      } catch { /* ignore */ }
    };
    const handleScroll = () => {
      try {
        if (!quill.root.querySelector('img')) return;
        hideResizerDuringScroll();
        if (scrollEndTimer) window.clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          scrollEndTimer = 0;
          syncResizerAfterScroll();
        }, 120);
      } catch { /* ignore */ }
    };
    const handleResize = () => {
      if (resizeDragRef.current) return;
      syncResizerAfterScroll();
    };

    function scheduleListSizeSync() {
      if (listSizeSyncFrameRef.current) return;
      listSizeSyncFrameRef.current = window.requestAnimationFrame(() => {
        listSizeSyncFrameRef.current = 0;
        syncListItemFontSizeFromChildren(quill.root);
      });
    }

    const handleContentChange = (delta) => {
      const ops = Array.isArray(delta?.ops) ? delta.ops : [];
      const hasImageDelta = ops.some((op) => op.insert?.image || op.attributes?.caption || op.attributes?.wrap || op.attributes?.borderRadius);
      const hasListDelta = ops.some((op) => op.attributes?.list);
      const hasStyleDelta = ops.some((op) => (
        op.attributes?.size ||
        op.attributes?.fontSizeDesktop ||
        op.attributes?.fontSizeMobile ||
        op.attributes?.lineHeight ||
        op.attributes?.lineHeightMobile ||
        op.attributes?.translateY ||
        op.attributes?.translateYMobile
      ));

      const hasImg = hasImageDelta && (() => {
        try {
          return !!quill.root.querySelector('img');
        } catch {
          return false;
        }
      })();

      if (hasImg) {
        syncImageCaptionBlots();

        setTimeout(() => {
          positionResizerDirectly();
          syncImageCaptionBlots();
        }, 0);
      }

      if (hasListDelta) {
        scheduleListSizeSync();
      }

      if (!hasStyleDelta && !hasListDelta && !hasImageDelta) return;

      if (idleContentCleanupRef.current) {
        cancelIdleWork(idleContentCleanupRef.current);
      }
      idleContentCleanupRef.current = scheduleIdleWork(() => {
        idleContentCleanupRef.current = 0;
        try {
          syncCustomFontSizes();
          if (hasListDelta) {
            syncListItemFontSizeFromChildren(quill.root);
          }
          cleanEmptyEditorParagraphs();
        } catch { /* ignore */ }
      });
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    quill.root.addEventListener('scroll', handleScroll, true);

    const handleKeydownCapture = (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        try {
          const sel = quill.getSelection() || savedSelectionRef.current;
          if (sel) {
            let inheritedFont = null;
            let inheritedSize = null;
            let inheritedColor = null;
            let inheritedLineHeight = null;

            for (let i = sel.index - 1; i >= Math.max(0, sel.index - 200); i--) {
              const fmt = quill.getFormat(i, 1);
              if (fmt?.font && fmt.font !== 'macdinh') {
                inheritedFont = fmt.font;
                inheritedSize = fmt.size;
                inheritedColor = fmt.color;
                inheritedLineHeight = fmt.lineHeight;
                break;
              }
            }

            if (!inheritedFont) {
              const domSelection = typeof window !== 'undefined' ? window.getSelection() : null;
              if (domSelection && domSelection.anchorNode) {
                const el = domSelection.anchorNode.nodeType === 1 ? domSelection.anchorNode : domSelection.anchorNode.parentElement;
                const fontEl = el?.closest?.('[class*="ql-font-"], [style*="font-family"]');
                if (fontEl) {
                  const cls = Array.from(fontEl.classList || []).find(c => c.startsWith('ql-font-'));
                  if (cls) {
                    inheritedFont = cls.replace('ql-font-', '');
                  } else if (fontEl.style?.fontFamily) {
                    const cleanFam = fontEl.style.fontFamily.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
                    inheritedFont = cleanFam.replace(/\s+/g, '-');
                  }
                }
              }
            }

            if (inheritedFont) {
              lastActiveFormatsRef.current = {
                font: inheritedFont,
                size: inheritedSize,
                color: inheritedColor,
                lineHeight: inheritedLineHeight
              };
            }
          }
        } catch (err) { /* ignore */ }
      }
    };

    quill.root.addEventListener('keydown', handleKeydownCapture, true);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(quill.root);

    const listSizeObserver = new MutationObserver((mutations) => {
      const shouldSync = mutations.some((mutation) => (
        mutation.attributeName === 'data-list'
        || mutation.target?.closest?.('li')
        || Array.from(mutation.addedNodes || []).some((node) => (
          node.nodeType === 1 && (node.matches?.('li') || node.querySelector?.('li'))
        ))
      ));
      if (shouldSync) scheduleListSizeSync();
    });
    listSizeObserver.observe(quill.root, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-list'],
      childList: true,
      subtree: true,
    });

    if (quill.keyboard && Array.isArray(quill.keyboard.bindings[13])) {
      quill.keyboard.bindings[13] = quill.keyboard.bindings[13].filter(b => !b._isCustomEnter);

      const customEnterBinding = {
        key: 13,
        _isCustomEnter: true,
        handler: function (range, context) {
          // Allow native handling for lists, code blocks, tables
          if (context.format.list || context.format['code-block'] || context.format.table) {
            return true;
          }

          if (range.length > 0) {
            this.quill.deleteText(range.index, range.length, 'user');
          }

          // Scan backwards for nearest active font/size/color/lineHeight
          const inlineFormats = {};
          try {
            let prevFmt = null;
            if (range && typeof range.index === 'number') {
              try {
                const [currentLine] = this.quill.getLine(range.index);
                if (currentLine) {
                  inlineFormats.font = resolveFontFromDomNode(currentLine.domNode);
                  if (!inlineFormats.font && currentLine.prev) {
                    inlineFormats.font = resolveFontFromDomNode(currentLine.prev.domNode);
                  }
                }
              } catch { /* ignore */ }
            }
            if (!inlineFormats.font && range.index > 0) {
              for (let i = range.index - 1; i >= Math.max(0, range.index - 100); i--) {
                const f = this.quill.getFormat(i, 1);
                if (f?.font && f.font !== 'macdinh') {
                  inlineFormats.font = f.font;
                  break;
                }
              }
              prevFmt = this.quill.getFormat(range.index - 1, 1);
            }
            if (!inlineFormats.font && context.format.font && context.format.font !== 'macdinh') {
              inlineFormats.font = context.format.font;
            }
            if (!inlineFormats.font && lastActiveFormatsRef.current?.font && lastActiveFormatsRef.current.font !== 'macdinh') {
              inlineFormats.font = lastActiveFormatsRef.current.font;
            }
            if (!inlineFormats.font) {
              try {
                const fontNode = this.quill.root.querySelector('[style*="font-family"], [class*="ql-font-"]');
                inlineFormats.font = resolveFontFromDomNode(fontNode);
              } catch (e2) { /* ignore */ }
            }
            if (prevFmt?.size) inlineFormats.size = prevFmt.size;
            else if (context.format.size) inlineFormats.size = context.format.size;

            if (prevFmt?.color) inlineFormats.color = prevFmt.color;
            else if (context.format.color) inlineFormats.color = context.format.color;

            if (prevFmt?.lineHeight) inlineFormats.lineHeight = prevFmt.lineHeight;
            else if (context.format.lineHeight) inlineFormats.lineHeight = context.format.lineHeight;
          } catch (e) { /* ignore */ }


          const lineFormats = {};
          if (context.format.align) lineFormats.align = context.format.align;
          if (context.format.direction) lineFormats.direction = context.format.direction;

          // Insert exactly ONE newline
          this.quill.insertText(range.index, '\n', lineFormats, 'user');
          this.quill.setSelection(range.index + 1, 0, 'silent');

          if (inlineFormats.font) {
            lastActiveFormatsRef.current = { ...inlineFormats };
          }

          // Apply inline formats to the cursor
          Object.keys(inlineFormats).forEach((name) => {
            if (inlineFormats[name]) {
              try {
                this.quill.format(name, inlineFormats[name], 'user');
              } catch (e) { /* ignore */ }
            }
          });

          window.setTimeout(() => {
            try {
              updateSizePickerLabel();
            } catch (e) { /* ignore */ }
          }, 0);

          return false;
        }
      };

      quill.keyboard.bindings[13].unshift(customEnterBinding);
    }

    const handleAutoInheritFormatsOnTextChange = (delta, oldDelta, source) => {
      if (source !== 'user' || !delta || !Array.isArray(delta.ops)) return;
      let activeFormats = lastActiveFormatsRef.current;

      let pos = 0;
      let formattedAny = false;
      delta.ops.forEach((op) => {
        if (op.retain) {
          pos += op.retain;
        } else if (typeof op.insert === 'string' && op.insert.length > 0 && op.insert !== '\n') {
          const insertLen = op.insert.length;
          const attrs = op.attributes || {};
          let targetFont = activeFormats?.font;
          if (!targetFont && pos > 0) {
            for (let i = pos - 1; i >= Math.max(0, pos - 100); i--) {
              const fmt = quill.getFormat(i, 1);
              if (fmt?.font && fmt.font !== 'macdinh') {
                targetFont = fmt.font;
                if (!activeFormats) activeFormats = {};
                activeFormats.font = targetFont;
                lastActiveFormatsRef.current = { ...lastActiveFormatsRef.current, font: targetFont };
                break;
              }
            }
          }

          if (targetFont && (!attrs.font || attrs.font === 'macdinh')) {
            try {
              quill.formatText(pos, insertLen, 'font', targetFont, 'silent');
              formattedAny = true;
            } catch { /* ignore */ }
          }
          if (activeFormats.size && !attrs.size) {
            try {
              quill.formatText(pos, insertLen, 'size', activeFormats.size, 'silent');
              formattedAny = true;
            } catch { /* ignore */ }
          }
          if (activeFormats.color && !attrs.color) {
            try {
              quill.formatText(pos, insertLen, 'color', activeFormats.color, 'silent');
              formattedAny = true;
            } catch { /* ignore */ }
          }
          if (activeFormats.lineHeight && !attrs.lineHeight) {
            try {
              quill.formatText(pos, insertLen, 'lineHeight', activeFormats.lineHeight, 'silent');
              formattedAny = true;
            } catch { /* ignore */ }
          }
          pos += insertLen;
        }
      });

      if (formattedAny && activeFormats.font) {
        try {
          quill.format('font', activeFormats.font, 'silent');
        } catch { /* ignore */ }
        const html = quill.root.innerHTML;
        localEditorHtmlRef.current = html;
        if (commitOnBlurOnly) {
          lastRelativeContentRef.current = html;
          onDraftChangeRef.current?.(html);
        }
      }
    };

    quill.on('text-change', handleAutoInheritFormatsOnTextChange);
    quill.on('text-change', updateSizePickerLabel);
    quill.on('text-change', handleContentChange);

    // Initial trigger
    setTimeout(() => {
      syncImageCaptionBlots();
      updateSizePickerLabel();
      syncCustomFontSizes();
      syncListItemFontSizeFromChildren(quill.root);
      cleanEmptyEditorParagraphs();
      setTimeout(handleResize, 50);
      if (toolbar) {
        try {
          toolbar.update(null);
        } catch { /* ignore */ }
      }
    }, 100);

    return () => {
      container.removeEventListener('mousedown', handleMousedown, true);
      container.removeEventListener('mouseup', handleMouseup, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      quill.root.removeEventListener('scroll', handleScroll, true);

      if (scrollEndTimer) window.clearTimeout(scrollEndTimer);
      if (listSizeSyncFrameRef.current) {
        window.cancelAnimationFrame(listSizeSyncFrameRef.current);
        listSizeSyncFrameRef.current = 0;
      }
      if (idleContentCleanupRef.current) {
        cancelIdleWork(idleContentCleanupRef.current);
        idleContentCleanupRef.current = 0;
      }
      resizeObserver.disconnect();
      listSizeObserver.disconnect();
      container.querySelectorAll('.editor-inline-image-caption').forEach((el) => el.remove());
      document.querySelectorAll('.editor-inline-image-caption-preview').forEach((el) => el.remove());
      quill.off('text-change', updateSizePickerLabel);
      quill.off('text-change', handleContentChange);
    };
  }, [
    isReady,
    closeControlPopups,
    isCustomControlTarget,
    syncImageCaptionBlots,
    positionResizerDirectly,
    syncSelectedImageRect,
    updateSizePickerLabel,
    preserveAdminScrollDuring,
    setSelectionWithoutScroll,
    syncSelectionControlsFromFormat,
    syncCustomFontSizes,
    cleanEmptyEditorParagraphs,
  ]);
  useEffect(() => {
    if (!isReady) return;

    const initSearch = () => {
      const pickers = containerRef.current?.querySelectorAll('.ql-font .ql-picker-options');
      if (!pickers) return;

      pickers.forEach(picker => {
        const bindFontSearch = (wrapper) => {
          const input = wrapper.querySelector('input');
          if (!input) return;
          const fontPicker = picker.closest('.ql-font.ql-picker');

          const keepFontPickerOpen = () => {
            fontSearchDropdownOpenRef.current = true;
            fontPicker?.classList.add('ql-expanded');
          };
          const keepSearchInteraction = (event, { allowDefault = false } = {}) => {
            if (!allowDefault) event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            keepFontPickerOpen();
            window.setTimeout(keepFontPickerOpen, 0);
          };

          const filterVisibleItems = (value) => {
            const search = value.trim().toLowerCase();
            const normalizedSearch = search.replace(/[-_ ]/g, '');
            const items = picker.querySelectorAll('.ql-picker-item');
            items.forEach(item => {
              const rawVal = item.getAttribute('data-value') || 'macdinh';
              const dataLabel = item.getAttribute('data-label') || item.getAttribute('aria-label') || '';
              const searchable = `${rawVal} ${item.textContent || ''} ${dataLabel}`.toLowerCase();
              const tokens = searchable
                .split(/[\s\-_]+/)
                .map(token => token.trim())
                .filter(Boolean);
              const compact = searchable.replace(/[-_ ]/g, '');
              const isVisible =
                !normalizedSearch ||
                tokens.some(token => token.startsWith(search)) ||
                compact.startsWith(normalizedSearch) ||
                rawVal === 'macdinh';
              item.classList.toggle('font-search-hidden', !isVisible);
              if (isVisible) {
                item.style.removeProperty('display');
                item.removeAttribute('hidden');
              } else {
                item.style.setProperty('display', 'none', 'important');
                item.setAttribute('hidden', 'hidden');
              }
            });
          };

          input.__applyFontSearch = filterVisibleItems;
          input.value = fontSearchValueRef.current;
          filterVisibleItems(input.value);
          if (wrapper.dataset.fontSearchEventsBound !== 'true') {
            wrapper.dataset.fontSearchEventsBound = 'true';
            ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach((eventName) => {
              wrapper.addEventListener(eventName, (event) => {
                keepSearchInteraction(event, { allowDefault: event.target === input });
              }, true);
            });
          }
          ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach((eventName) => {
            input[`on${eventName}`] = (event) => keepSearchInteraction(event, { allowDefault: true });
          });
          input.onclick = (e) => {
            keepSearchInteraction(e, { allowDefault: true });
          };
          input.onmousedown = (e) => {
            keepSearchInteraction(e, { allowDefault: true });
          };
          input.onfocus = () => {
            keepFontPickerOpen();
          };
          input.onkeydown = (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            keepFontPickerOpen();
            if (e.key === 'Enter') e.preventDefault();
            window.setTimeout(() => input.__applyFontSearch?.(input.value), 0);
          };
          const handleSearchInput = (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            keepFontPickerOpen();
            fontSearchValueRef.current = e.target.value;
            input.__applyFontSearch?.(e.target.value);
          };
          input.oninput = handleSearchInput;
          input.onkeyup = handleSearchInput;

          if (picker.dataset.fontSearchDelegated !== 'true') {
            picker.dataset.fontSearchDelegated = 'true';
            picker.addEventListener('input', (event) => {
              if (!event.target?.classList?.contains('font-search-input')) return;
              event.stopPropagation();
              keepFontPickerOpen();
              fontSearchValueRef.current = event.target.value;
              event.target.__applyFontSearch?.(event.target.value);
            }, true);
          }
        };

        const fontPicker = picker.closest('.ql-font.ql-picker');
        let wrapper = picker.querySelector('.font-search-wrapper') || fontPicker?.querySelector(':scope > .font-search-wrapper');
        if (wrapper && wrapper.parentElement === picker && fontPicker) {
          fontPicker.insertBefore(wrapper, picker);
        }

        if (!wrapper) {
          const wrapper = document.createElement('div');
          wrapper.className = 'font-search-wrapper';
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = 'Tìm kiếm font...';
          input.className = 'font-search-input';
          wrapper.appendChild(input);
          if (fontPicker) {
            fontPicker.insertBefore(wrapper, picker);
          } else {
            picker.insertBefore(wrapper, picker.firstChild);
          }
          bindFontSearch(wrapper);
        } else {
          bindFontSearch(wrapper);
        }
      });
    };

    initSearch();
    const interval = setInterval(initSearch, 1000);
    return () => clearInterval(interval);
  }, [isReady, dynamicFonts, modules]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const stabilizeToolbar = () => {
      const container = containerRef.current;
      if (!container) return;

      const toolbar = container.querySelector('.ql-toolbar');
      if (!toolbar) return;

      toolbar.__overflowObserver?.disconnect?.();
      toolbar.__overflowObserver = null;
      toolbar.__toolbarDropdownReady = false;
      toolbar.__updateToolbarOverflow = null;
      toolbar.__overflowUpdateQueued = false;
      toolbar.classList.remove(
        'ql-toolbar-overflowing',
        'ql-toolbar-narrow',
        'ql-toolbar-expanded',
        'ql-toolbar-measuring'
      );

      const moreGroup = toolbar.querySelector('.ql-more')?.closest('.ql-formats');
      const dropdown = moreGroup?.querySelector('.ql-more-dropdown');
      if (moreGroup && dropdown) {
        Array.from(dropdown.children).forEach((child) => {
          if (child.classList?.contains('ql-formats')) {
            toolbar.insertBefore(child, moreGroup);
          }
        });
        moreGroup.remove();
      }

      toolbar.querySelectorAll('.ql-overflow-hidden').forEach((group) => {
        group.classList.remove('ql-overflow-hidden');
      });
    };

    stabilizeToolbar();

    return () => {
      const toolbar = containerRef.current?.querySelector('.ql-toolbar');
      toolbar?.__overflowObserver?.disconnect?.();
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const toolbar = containerRef.current.querySelector('.ql-toolbar');
    if (!toolbar) return;

    const positionNativePicker = (event) => {
      const label = event.target instanceof Element
        ? event.target.closest('.ql-picker-label')
        : null;
      const picker = label?.closest('.ql-picker');
      if (!picker || !toolbar.contains(picker)) return;

      // Quill toggles the picker on the target mousedown. Position only after
      // that native handler has run; this listener never opens or closes it.
      window.requestAnimationFrame(() => {
        if (!picker.isConnected || !picker.classList.contains('ql-expanded')) return;
        if (!picker.classList.contains('ql-color') &&
            !picker.classList.contains('ql-colorMobile') &&
            !picker.classList.contains('ql-background') &&
            !picker.classList.contains('ql-align')) return;

        const labelRect = label.getBoundingClientRect();
        const paletteHeight = picker.classList.contains('ql-align') ? 80 : 210;
        const top = Math.max(12, Math.min(labelRect.bottom + 8, window.innerHeight - paletteHeight - 12));
        picker.style.setProperty('--ql-mobile-palette-top', `${top}px`);
        if (!picker.classList.contains('ql-align')) {
          const options = picker.querySelector('.ql-picker-options');
          options?.style.setProperty('width', '166px', 'important');
          options?.style.setProperty('max-width', 'calc(100vw - 24px)', 'important');
        }
      });
    };

    toolbar.addEventListener('mousedown', positionNativePicker, true);
    return () => {
      toolbar.removeEventListener('mousedown', positionNativePicker, true);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const toolbar = containerRef.current.querySelector('.ql-toolbar');
    if (!toolbar) return;

    const rememberToolbarScroll = () => {
      toolbarScrollSnapshotRef.current = takeEditorScrollSnapshot();
    };

    toolbar.addEventListener('pointerdown', rememberToolbarScroll, true);
    toolbar.addEventListener('mousedown', rememberToolbarScroll, true);
    toolbar.addEventListener('touchstart', rememberToolbarScroll, true);

    return () => {
      toolbar.removeEventListener('pointerdown', rememberToolbarScroll, true);
      toolbar.removeEventListener('mousedown', rememberToolbarScroll, true);
      toolbar.removeEventListener('touchstart', rememberToolbarScroll, true);
    };
  }, [isReady, takeEditorScrollSnapshot]);

  React.useImperativeHandle(ref, () => ({
    getEditor: () => {
      try {
        return editorRef.current?.getEditor();
      } catch {
        return null;
      }
    },
    focus: () => {
      try {
        focusWithoutScroll(editorRef.current);
      } catch { /* ignore */ }
    },
    blur: () => {
      try {
        editorRef.current?.blur();
      } catch { /* ignore */ }
    },
    flushPendingChanges: () => {
      try {
        commitControlDrafts();
        const content = emitCurrentContentForSaveRef.current?.();
        return {
          content: content ?? lastRelativeContentRef.current ?? "",
        };
      } catch {
        return {
          content: lastRelativeContentRef.current ?? "",
        };
      }
    },
  }));

  useEffect(() => {
    const initFonts = async () => {
      if (!cachedFonts) {
        if (!fetchPromise) {
          fetchPromise = (async () => {
            try {
              const sorted = await fetchEditorFonts();
              const finalWhitelist = ['macdinh', ...sorted.map(f => f.slug)];
              if (typeof window !== "undefined" && Quill) {
                const FontStyle = Quill.import("attributors/style/font");
                if (FontStyle) {
                  FontStyle.whitelist = finalWhitelist;

                  // Wrap value function to normalize browser font-family name to our slug representation
                  const originalValue = FontStyle.value;
                  FontStyle.value = function (domNode) {
                    let rawVal = originalValue ? originalValue.call(this, domNode) : '';
                    if (!rawVal && domNode && domNode.classList) {
                      const fontClass = Array.from(domNode.classList).find(c => c.startsWith('ql-font-'));
                      if (fontClass) {
                        rawVal = fontClass.replace('ql-font-', '');
                      }
                    }
                    if (!rawVal && domNode && domNode.getAttribute) {
                      const styleAttr = domNode.getAttribute('style') || '';
                      const match = styleAttr.match(/font-family\s*:\s*([^;]+)/i);
                      if (match) rawVal = match[1];
                    }
                    if (!rawVal && domNode && domNode.style && domNode.style.fontFamily) {
                      rawVal = domNode.style.fontFamily;
                    }
                    if (!rawVal) return rawVal;

                    const cleanVal = String(rawVal).replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
                    const cleanSlug = cleanVal.replace(/\s+/g, '-');

                    if (cleanVal === 'inter' || cleanVal === 'macdinh') {
                      return 'macdinh';
                    }

                    const listToSearch = sorted || cachedFonts || [];
                    const matched = listToSearch.find(f =>
                      f.slug.toLowerCase() === cleanVal ||
                      f.slug.toLowerCase() === cleanSlug ||
                      (f.name && slugify(f.name) === cleanVal) ||
                      (f.name && slugify(f.name) === cleanSlug) ||
                      (f.family && slugify(f.family) === cleanVal) ||
                      (f.family && slugify(f.family) === cleanSlug) ||
                      (f.name && f.name.toLowerCase() === cleanVal) ||
                      (f.family && f.family.toLowerCase() === cleanVal)
                    );

                    if (matched) {
                      return matched.slug;
                    }

                    if (finalWhitelist.includes(cleanSlug)) {
                      return cleanSlug;
                    }
                    if (finalWhitelist.includes(cleanVal)) {
                      return cleanVal;
                    }

                    return rawVal;
                  };

                  const originalAdd = FontStyle.add;
                  FontStyle.add = function (domNode, value) {
                    if (originalAdd) originalAdd.call(this, domNode, value);
                    if (domNode && domNode.classList) {
                      Array.from(domNode.classList).forEach(c => {
                        if (c.startsWith('ql-font-')) domNode.classList.remove(c);
                      });
                      if (value && value !== 'macdinh') {
                        domNode.classList.add(`ql-font-${value}`);
                      }
                    }
                    return true;
                  };

                  Quill.register({
                    'formats/font': FontStyle,
                    'attributors/style/font': FontStyle
                  }, true);
                }
              }
              cachedFonts = sorted;
              return sorted;
            } catch (e) {
              console.error(e);
            }
            cachedFonts = [];
            return [];
          })();
        }
        const result = await fetchPromise;
        setDynamicFonts(result);
      } else {
        setDynamicFonts(cachedFonts);
      }
    };
    initFonts();
  }, []);

  const hasLineHeight = !!onChangeLineHeight;
  const hasTranslateY = !!onChangeTranslateY;

  useEffect(() => {
    if (dynamicFonts.length > 0 || (cachedFonts && cachedFonts.length >= 0)) {
      const currentFonts = dynamicFonts.length > 0 ? dynamicFonts : (cachedFonts || []);
      const toolbarFontValues = [false, ...currentFonts.map(f => f.slug)];
      const showSpacingAndTranslation = hasLineHeight || hasTranslateY;
      setModules(createModules(toolbarFontValues, hasResponsive, showSpacingAndTranslation, hasResponsiveColor));
      setIsReady(true);
    }
  }, [dynamicFonts, hasResponsive, hasLineHeight, hasTranslateY, hasResponsiveColor]);

  useEffect(() => {
    if (!isReady || !fontSearchDropdownOpenRef.current) return;

    const restoreFontSearch = () => {
      const picker = containerRef.current?.querySelector('.ql-font.ql-picker');
      if (!picker) return;

      picker.classList.add('ql-expanded');
      const input = picker.querySelector('.font-search-input');
      if (input) {
        input.value = fontSearchValueRef.current;
        input.focus();
      }
    };

    window.requestAnimationFrame(restoreFontSearch);
    const timeout = window.setTimeout(restoreFontSearch, 80);
    return () => window.clearTimeout(timeout);
  }, [dynamicFonts, modules, isReady]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const quill = getQuillEditor();
    if (!quill || quill.__preventAdminScrollIntoView) return;

    const originalScrollSelectionIntoView = quill.scrollSelectionIntoView?.bind(quill);
    const originalSelectionScrollIntoView = quill.selection?.scrollIntoView?.bind(quill.selection);

    if (originalScrollSelectionIntoView) {
      quill.scrollSelectionIntoView = (...args) => {
        preserveScrollAround(quill.root, () => originalScrollSelectionIntoView(...args));
      };
    }

    if (originalSelectionScrollIntoView) {
      quill.selection.scrollIntoView = (...args) => {
        preserveScrollAround(quill.root, () => originalSelectionScrollIntoView(...args));
      };
    }

    quill.__preventAdminScrollIntoView = true;

    return () => {
      if (originalScrollSelectionIntoView) {
        quill.scrollSelectionIntoView = originalScrollSelectionIntoView;
      }
      if (originalSelectionScrollIntoView && quill.selection) {
        quill.selection.scrollIntoView = originalSelectionScrollIntoView;
      }
      delete quill.__preventAdminScrollIntoView;
    };
  }, [getQuillEditor, isReady, preserveScrollAround]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const targetClasses = [...editorClassName.split(' ').filter(Boolean)];

    const syncEditorState = (qlEditor) => {
      // 1. Sync class names
      targetClasses.forEach(c => {
        if (!qlEditor.classList.contains(c)) {
          qlEditor.classList.add(c);
        }
      });
      const currentClasses = Array.from(qlEditor.classList);
      currentClasses.forEach(c => {
        if (c !== 'ql-editor' && c !== 'ql-blank' && !c.startsWith('ql-') && !targetClasses.includes(c)) {
          qlEditor.classList.remove(c);
        }
      });

      qlEditor.querySelectorAll('*[style*="--fs"]').forEach(el => {
        el.style.removeProperty('--fs');
      });
    };

    // Run sync initially if the editor is already present
    const qlEditor = containerRef.current?.querySelector('.ql-editor');
    const quill = getQuillEditor();
    if (!qlEditor || !quill) {
      if (clipboardAttachRetryRef.current >= 20) return;
      clipboardAttachRetryRef.current += 1;
      const retryTimer = window.setTimeout(() => {
        setEditorInstanceVersion((version) => version + 1);
      }, 50);
      return () => window.clearTimeout(retryTimer);
    }

    clipboardAttachRetryRef.current = 0;
    syncEditorState(qlEditor);

    let handlePaste = null;
    let handleCopy = null;
    let handleCopyShortcut = null;

    if (quill) {
      const getCopySelection = () => {
        let liveSelection = null;
        try {
          liveSelection = quill.getSelection?.() || null;
        } catch {
          liveSelection = null;
        }

        return selectCopyRange(
          liveSelection,
          pendingCopySelectionRef.current,
          lastHighlightSelectionRef.current,
          savedSelectionRef.current,
          quill.selection?.savedRange,
        );
      };

      handleCopyShortcut = (e) => {
        if (!(e.ctrlKey || e.metaKey) || String(e.key || '').toLowerCase() !== 'c') return;
        pendingCopySelectionRef.current = getCopySelection();
      };

      handleCopy = (e) => {
        if (!e.clipboardData) return;

        const range = getCopySelection();
        const expandedRange = expandCopyRangeToLeadingWhitespace(quill, range);
        if (!range || !expandedRange) return;

        const copiedDelta = preserveDeltaSignificantWhitespace(
          quill.getContents(expandedRange.index, expandedRange.length)
        );
        const serializedDelta = serializeRichTextDelta(copiedDelta);
        const copiedText = preserveSignificantHorizontalWhitespace(
          quill.getText(expandedRange.index, expandedRange.length).replace(/\r\n?/g, '\n')
        );
        const selection = typeof window !== 'undefined' ? window.getSelection?.() : null;
        let copiedHtml = '';
        try {
          if (selection && selection.rangeCount > 0) {
            const container = document.createElement('div');
            for (let index = 0; index < selection.rangeCount; index += 1) {
              container.appendChild(selection.getRangeAt(index).cloneContents());
            }
            copiedHtml = container.innerHTML;
          }
        } catch {
          copiedHtml = '';
        }
        if (!copiedHtml) {
          copiedHtml = copiedText.replace(/\n/g, '<br>');
        }

        lastRichTextClipboard = {
          copiedAt: Date.now(),
          serializedDelta,
          text: copiedText,
        };

        e.preventDefault();
        e.stopImmediatePropagation();
        e.clipboardData.setData('text/plain', copiedText);
        e.clipboardData.setData(
          'text/html',
          embedRichTextDeltaInHtml(copiedHtml, serializedDelta)
        );
        try {
          e.clipboardData.setData(RICH_TEXT_DELTA_MIME, serializedDelta);
        } catch {
          // Some browsers reject custom clipboard MIME types; HTML/plain text remain available.
        }
        pendingCopySelectionRef.current = null;
      };

      handlePaste = (e) => {
        const clipboard = e.clipboardData || window.clipboardData;
        let text = clipboard.getData('text/plain');
        const clipboardHtml = clipboard.getData('text/html');
        let serializedDelta = '';
        try {
          serializedDelta = clipboard.getData(RICH_TEXT_DELTA_MIME);
        } catch {
          // Fall back to the browser's HTML/plain text clipboard payload.
        }
        if (!serializedDelta) {
          serializedDelta = extractRichTextDeltaFromHtml(clipboardHtml);
        }
        const normalizedClipboardText = String(text || '').replace(/\r\n?/g, '\n');
        const recentInternalCopy = lastRichTextClipboard &&
          Date.now() - lastRichTextClipboard.copiedAt < 10 * 60 * 1000 &&
          clipboardTextMatches(normalizedClipboardText, lastRichTextClipboard.text);
        if (!serializedDelta && recentInternalCopy) {
          serializedDelta = lastRichTextClipboard.serializedDelta;
        }

        if (!isSimpleTextField && serializedDelta) {
          const Delta = Quill.import('delta');
          const copiedDelta = parseRichTextDelta(serializedDelta, Delta);
          const range = quill.getSelection() || quill.getSelection(true);
          if (copiedDelta && range) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const change = new Delta()
              .retain(range.index)
              .delete(range.length)
              .concat(copiedDelta);
            quill.updateContents(change, 'user');
            setSelectionWithoutScroll(quill, range.index + copiedDelta.length());
            return;
          }
        }

        if (!isSimpleTextField && !text) {
          if (clipboardHtml && typeof DOMParser !== 'undefined') {
            const clipboardDoc = new DOMParser().parseFromString(clipboardHtml, 'text/html');
            const hasOnlyWhitespace = !(clipboardDoc.body.textContent || '').trim();
            if (hasOnlyWhitespace) {
              const blockCount = clipboardDoc.body.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').length;
              const breakCount = clipboardDoc.body.querySelectorAll('br').length;
              text = '\n'.repeat(Math.max(blockCount, breakCount, 1));
            }
          }
        }

        const normalizedText = String(text || '').replace(/\r\n?/g, '\n');
        const clipboardHtmlText = extractClipboardHtmlText(clipboardHtml).replace(/\r\n?/g, '\n');
        const spacingSource = selectClipboardSpacingSource(normalizedText, clipboardHtmlText);
        const isWhitespaceOnlyPaste = normalizedText.length > 0 && !normalizedText.trim();
        const hasSignificantSpacing = hasSignificantHorizontalWhitespace(spacingSource);
        if (!isSimpleTextField && !isWhitespaceOnlyPaste && !hasSignificantSpacing) return;

        const insertedText = !isSimpleTextField && (isWhitespaceOnlyPaste || hasSignificantSpacing)
          ? preserveSignificantHorizontalWhitespace(normalizedText)
          : normalizedText;

        e.preventDefault();
        e.stopImmediatePropagation();
        const range = quill.getSelection() || quill.getSelection(true);
        if (range) {
          if (!isSimpleTextField && hasSignificantSpacing) {
            if (range.length > 0) quill.deleteText(range.index, range.length, 'user');
            quill.insertText(range.index, insertedText, 'user');
            setSelectionWithoutScroll(quill, range.index + insertedText.length);
            return;
          }

          if (!isSimpleTextField && clipboardHtml && !isWhitespaceOnlyPaste) {
            const Delta = Quill.import('delta');
            const converted = quill.clipboard.convert({
              html: preserveClipboardHtmlWhitespace(clipboardHtml),
              text: normalizedText,
            });
            const preservedDelta = restoreDeltaLeadingWhitespace(converted, spacingSource, Delta);
            const change = new Delta()
              .retain(range.index)
              .delete(range.length)
              .concat(preservedDelta);
            quill.updateContents(change, 'user');
            setSelectionWithoutScroll(quill, range.index + preservedDelta.length());
            return;
          }

          if (range.length > 0) quill.deleteText(range.index, range.length, 'user');
          quill.insertText(range.index, insertedText, 'user');
          setSelectionWithoutScroll(quill, range.index + insertedText.length);
        } else {
          quill.setText(insertedText, 'user');
        }
      };
      // Capture before Quill's own paste listener so content is inserted once
      // with significant spacing intact instead of being normalized first.
      quill.root.addEventListener('keydown', handleCopyShortcut, true);
      quill.root.addEventListener('copy', handleCopy, true);
      quill.root.addEventListener('paste', handlePaste, true);
    }

    return () => {
      if (quill) {
        try {
          if (handleCopyShortcut) quill.root.removeEventListener('keydown', handleCopyShortcut, true);
          if (handleCopy) quill.root.removeEventListener('copy', handleCopy, true);
          if (handlePaste) quill.root.removeEventListener('paste', handlePaste, true);
        } catch { /* ignore */ }
      }
    };
  }, [
    editorClassName,
    editorInstanceVersion,
    getQuillEditor,
    isReady,
    isSimpleTextField,
    setSelectionWithoutScroll,
  ]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const initSizeInput = () => {
      const container = containerRef.current;
      if (!container) return;

      const sizePickers = container.querySelectorAll('.ql-size.ql-picker');
      sizePickers.forEach(picker => {
        const label = picker.querySelector('.ql-picker-label');
        if (!label || label.getAttribute('data-input-initialized')) return;
        label.setAttribute('data-input-initialized', 'true');

        // Watch for changes on data-value attribute to extract numbers
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-value') {
              const quill = getQuillEditor();
              if (quill) {
                let format = {};
                try {
                  const sel = quill.getSelection();
                  format = sel ? quill.getFormat(sel) : {};
                } catch { /* ignore */ }
                const size = format.size;
                if (size) {
                  if (Array.isArray(size)) {
                    observer.disconnect();
                    label.setAttribute('data-value', '');
                    label.setAttribute('data-display-value', '');
                    observer.observe(label, { attributes: true, attributeFilter: ['data-value'] });
                    return;
                  } else if (typeof size === 'string') {
                    const cleanSize = size.replace('px', '');
                    observer.disconnect();
                    label.setAttribute('data-value', size);
                    label.setAttribute('data-display-value', cleanSize);
                    observer.observe(label, { attributes: true, attributeFilter: ['data-value'] });
                    return;
                  }
                }
              }
              const val = label.getAttribute('data-value');
              if (val) {
                label.setAttribute('data-display-value', val.replace('px', ''));
              } else {
                label.removeAttribute('data-display-value');
              }
            }
          });
        });

        const quill = getQuillEditor();
        let initialVal = label.getAttribute('data-value');
        if (quill) {
          let format = {};
          try {
            const sel = quill.getSelection();
            format = sel ? quill.getFormat(sel) : {};
          } catch { /* ignore */ }
          if (format.size) {
            const sizeVal = Array.isArray(format.size) ? format.size[0] : format.size;
            if (typeof sizeVal === 'string') {
              initialVal = sizeVal;
            }
          }
        }
        if (initialVal) {
          label.setAttribute('data-value', initialVal);
          label.setAttribute('data-display-value', initialVal.replace('px', ''));
        }
        observer.observe(label, { attributes: true, attributeFilter: ['data-value'] });

        const handleDblClick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          const quill = getQuillEditor();
          if (!quill) return;

          let input = picker.querySelector('.ql-custom-size-input');
          if (input) return;

          input = document.createElement('input');
          input.type = 'text';
          input.className = 'ql-custom-size-input';
          input.style.width = '42px';
          input.style.height = '20px';
          input.style.border = '1px solid #1A94FF';
          input.style.borderRadius = '4px';
          input.style.fontSize = '16px';
          input.style.textAlign = 'center';
          input.style.outline = 'none';
          input.style.padding = '0';
          input.style.boxSizing = 'border-box';
          input.style.margin = '0 2px';
          input.style.fontFamily = 'sans-serif';
          input.style.color = '#333';

          let currentFormat = {};
          try {
            const sel = quill.getSelection();
            currentFormat = sel ? quill.getFormat(sel) : {};
          } catch { /* ignore */ }
          let currentSizeVal = '16';
          if (currentFormat && currentFormat.size) {
            currentSizeVal = currentFormat.size.replace('px', '');
          }
          input.value = currentSizeVal;

          label.style.display = 'none';
          picker.insertBefore(input, label);

          input.focus({ preventScroll: true });
          input.select();

          const applySizeAndClose = () => {
            let val = input.value.trim();
            if (val) {
              // Supports integer and decimal values, then appends px automatically.
              if (/^\d+(\.\d+)?$/.test(val)) {
                val = `${val}px`;
              }
              preserveAdminScrollDuring(() => {
                const range = savedSelectionRef.current || quill.getSelection();
                if (range?.length > 0) {
                  setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                  quill.formatText(range.index, range.length, 'size', val, 'user');
                  syncListItemFontSizeFromChildren(quill.root);
                  setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                } else {
                  quill.format('size', val, 'user');
                  syncListItemFontSizeFromChildren(quill.root);
                }
              });
            }
            input.remove();
            label.style.display = '';
          };

          input.onkeydown = (ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') {
              ev.preventDefault();
              applySizeAndClose();
            } else if (ev.key === 'Escape') {
              ev.preventDefault();
              input.remove();
              label.style.display = '';
            }
          };

          input.onblur = () => {
            applySizeAndClose();
          };

          input.onclick = (ev) => ev.stopPropagation();
          input.onmousedown = (ev) => ev.stopPropagation();
        };

        label.addEventListener('dblclick', handleDblClick);

        // Inject custom size input into the size dropdown options list
        const optionsContainer = picker.querySelector('.ql-picker-options');
        if (optionsContainer && !optionsContainer.querySelector('.custom-size-dropdown-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'custom-size-dropdown-wrapper';
          wrapper.style.order = '-1';
          wrapper.style.position = 'sticky';
          wrapper.style.top = '0';
          wrapper.style.backgroundColor = '#fff';
          wrapper.style.zIndex = '10';
          wrapper.style.borderBottom = '1px solid #e2e8f0';
          wrapper.style.padding = '6px';
          wrapper.style.boxSizing = 'border-box';
          wrapper.style.width = '100%';

          wrapper.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px; width: 100%;">
              <input type="text" placeholder="Size..." class="custom-size-dropdown-input" style="flex: 1; min-width: 0; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; font-size: 16px; height: 30px; line-height: 30px; color: #333; background: #fff;" />
              <span class="custom-size-dropdown-apply-btn" style="width: 26px; height: 26px; min-width: 26px; flex-shrink: 0; background: #799f85; color: #fff; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; line-height: 26px; text-align: center; font-family: system-ui, -apple-system, sans-serif; transition: background 0.2s;" title="Apply">OK</span>
            </div>
          `;

          const input = wrapper.querySelector('.custom-size-dropdown-input');
          const applyBtn = wrapper.querySelector('.custom-size-dropdown-apply-btn');

          const stopPropagation = (e) => e.stopPropagation();
          input.addEventListener('click', stopPropagation);
          input.addEventListener('mousedown', stopPropagation);
          input.addEventListener('mouseup', stopPropagation);
          input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          });

          applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleApply();
          });
          applyBtn.addEventListener('mousedown', stopPropagation);

          const handleApply = () => {
            const quillInstance = getQuillEditor();
            if (!quillInstance) return;

            let val = input.value.trim();
            if (val) {
              if (/^\d+(\.\d+)?$/.test(val)) {
                val = `${val}px`;
              }

              const savedSel = savedSelectionRef.current;
              if (savedSel) {
                setSelectionWithoutScroll(quillInstance, savedSel.index, savedSel.length, 'silent');
              }

              preserveAdminScrollDuring(() => {
                if (savedSel?.length > 0) {
                  quillInstance.formatText(savedSel.index, savedSel.length, 'size', val, 'user');
                  syncListItemFontSizeFromChildren(quillInstance.root);
                  setSelectionWithoutScroll(quillInstance, savedSel.index, savedSel.length, 'silent');
                } else {
                  quillInstance.format('size', val, 'user');
                  syncListItemFontSizeFromChildren(quillInstance.root);
                }
              });
              picker.classList.remove('ql-expanded');
              updateSizePickerLabel();
            }
          };

          input.addEventListener('blur', handleApply);

          // Populate initial value in dropdown input if available
          let currentFormat = {};
          try {
            const currentQuill = getQuillEditor();
            if (currentQuill) {
              const sel = currentQuill.getSelection();
              currentFormat = sel ? currentQuill.getFormat(sel) : {};
            }
          } catch { /* ignore */ }
          if (currentFormat && currentFormat.size) {
            const cleanSize = typeof currentFormat.size === 'string' ? currentFormat.size.replace('px', '') : '';
            input.value = cleanSize;
          }

          optionsContainer.appendChild(wrapper);
        }
      });
    };

    const interval = setInterval(initSizeInput, 1000);
    return () => clearInterval(interval);
  }, [isReady, updateSizePickerLabel, preserveAdminScrollDuring, setSelectionWithoutScroll]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ alt: "", title: "", caption: "", width: "", borderRadius: "" });
  const [modalCallback, setModalCallback] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "" });

  const openAltModal = useCallback((initialData, callback) => {
    console.log("DEBUG [Modal]: Dữ liệu truyền vào Modal là:", initialData);
    setModalData({
      alt: initialData.alt || "",
      title: initialData.title || "",
      caption: initialData.caption || "",
      width: initialData.width || "",
      borderRadius: initialData.borderRadius || ""
    });
    setModalCallback(() => callback);
    setIsModalOpen(true);
  }, []);

  const showAlert = (message) => {
    setAlertConfig({ isOpen: true, message });
  };

  const handleModalSubmit = (e) => {
    if (e) e.preventDefault();
    if (modalCallback) modalCallback(modalData);
    setIsModalOpen(false);
  };

  const updateResizerRect = syncSelectedImageRect;

  useEffect(() => {
    if (selectedImage) {
      syncSelectedImageRect();
      syncImageCaptionBlots();
      positionResizerDirectly();
    } else {
      setResizerRect((prev) => (prev === null ? prev : null));
    }
  }, [selectedImage, syncSelectedImageRect, syncImageCaptionBlots, positionResizerDirectly]);

  useEffect(() => {
    if (!resizerRect) return;
    const frameId = window.requestAnimationFrame(positionResizerDirectly);
    return () => window.cancelAnimationFrame(frameId);
  }, [resizerRect, positionResizerDirectly]);

  const handleContainerClick = useCallback((ev) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return;
    }
    // If clicking inside the resizer overlay or wrap toolbar, do not deselect
    if (resizerOverlayRef.current && resizerOverlayRef.current.contains(ev.target)) {
      return;
    }

    const img = ev.target.closest && ev.target.closest('img');
    const quill = getQuillEditor();
    if (!quill) return;

    if (img && quill.root.contains(img)) {
      enterImageEditMode(img, quill);
      return;
    }

    // Clicked outside image: deselect.
    if (selectedImageRef.current) {
      rememberSelectedImage(null);
      setResizerRect(null);
      setTimeout(() => {
        syncImageCaptionBlots();
      }, 50);
    }
  }, [enterImageEditMode, getQuillEditor, rememberSelectedImage, syncImageCaptionBlots]);

  const fileInputRef = useRef(null);

  const normalizeContentForSave = useCallback((content) => {
    const escapedUrlApi = URL_API.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`src=["']${escapedUrlApi}(assets/[^"']+)["']`, 'gi');
    const whitespaceOptions = { preserveWhitespaceOnly: preserveWhitespaceOnlyBlocks };
    let relativeContent = normalizeResponsiveLineHeightStyles(removeEmptyQuillParagraphs(
      stripEditorCaptionArtifacts(removeEmptyStyledSpans(content || "", whitespaceOptions)),
      whitespaceOptions
    )).replace(regex, 'src="/$1"');
    if (shouldNormalizeExcessiveIndent) {
      relativeContent = normalizeExcessiveLeadingWhitespaceAlignment(relativeContent);
    }
    if (preserveWhitespaceOnlyBlocks) {
      relativeContent = normalizeWhitespaceOnlyBlocksForQuill(relativeContent);
    }
    if (preserveInlineWhitespace) {
      relativeContent = preserveSignificantInlineWhitespaceForQuill(relativeContent);
    }
    relativeContent = relativeContent.replace(/src=["']https?:\/\/[^/]+\/(assets\/[^"']+)["']/gi, 'src="/$1"');

    const cleanBlockStyleString = (styleStr, tag = '') => {
      return styleStr
        .split(';')
        .map(part => part.trim())
        .filter(part => {
          if (!part) return false;
          const lower = part.toLowerCase();
          if (tag.toLowerCase() === 'li' && (lower.startsWith('--fs-desktop') || lower.startsWith('--fs-mobile'))) {
            return true;
          }
          return (
            !lower.startsWith('--fs-desktop') &&
            !lower.startsWith('--fs-mobile') &&
            !lower.startsWith('--custom-line-height') &&
            !lower.startsWith('--custom-line-height-mobile') &&
            !lower.startsWith('--translate-y') &&
            !lower.startsWith('--translate-y-mobile')
          );
        })
        .join('; ');
    };

    // Clean block styles
    relativeContent = relativeContent.replace(/<(p|li|h1|h2|h3|h4|h5|h6)\b([^>]*?)style=(["'])([^"']*?)\3([^>]*?)>/gi, (match, tag, before, quote, styleContent, after) => {
      const cleaned = cleanBlockStyleString(styleContent, tag);
      return cleaned ? `<${tag}${before}style=${quote}${cleaned}${quote}${after}>` : `<${tag}${before}${after}>`;
    });

    const shouldStripInlineFontSize = hasResponsive || isSimpleTextField;
    if (shouldStripInlineFontSize) {
      relativeContent = relativeContent.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
        const cleaned = canUseInlineSelectionControls
          ? stripFontSizeFromStyle(styleContent)
          : stripResponsiveControlVarsFromStyle(stripFontSizeFromStyle(styleContent));
        return cleaned ? `style=${quote}${cleaned}${cleaned ? quote : ""}` : "";
      });
      relativeContent = removeEmptyQuillParagraphs(removeEmptyStyledSpans(relativeContent, whitespaceOptions), whitespaceOptions);
    } else {
      relativeContent = relativeContent.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
        const cleaned = cleanStyleForSave(styleContent);
        return cleaned ? `style=${quote}${cleaned}${quote}` : "";
      });
    }

    relativeContent = removeEmptyQuillParagraphs(relativeContent, whitespaceOptions);
    if (preserveWhitespaceOnlyBlocks) {
      relativeContent = normalizeWhitespaceOnlyBlocksForQuill(relativeContent);
    }
    return preserveInlineWhitespace
      ? preserveSignificantInlineWhitespaceForQuill(relativeContent)
      : relativeContent;
  }, [canUseInlineSelectionControls, hasResponsive, isSimpleTextField, preserveInlineWhitespace, preserveWhitespaceOnlyBlocks, shouldNormalizeExcessiveIndent]);

  const emitCurrentContentForSave = useCallback((forceCommit = false) => {
    const quill = getQuillEditor();
    const html = quill?.root?.innerHTML || localEditorHtmlRef.current || "";
    const relativeContent = normalizeContentForSave(html);
    localEditorHtmlRef.current = html;
    lastRelativeContentRef.current = relativeContent;

    if (commitOnBlurOnly && !forceCommit) {
      onDraftChange?.(relativeContent);
    } else {
      props.onChange?.(relativeContent);
    }

    return relativeContent;
  }, [commitOnBlurOnly, getQuillEditor, normalizeContentForSave, onDraftChange, props]);
  emitCurrentContentForSaveRef.current = emitCurrentContentForSave;

  const handleOnChange = useCallback((content, delta, source, editor) => {
    if (isSyncingExternalValueRef.current) return;
    if (onChangeRef.current) {
      if (source !== 'user') return;
      const quillRoot = editor?.root || getQuillEditor()?.root;

      if (commitOnBlurOnly) {
        const draftContent = content || quillRoot?.innerHTML || "";
        isUserEditingRef.current = true;
        localEditorHtmlRef.current = draftContent;
        const selectionAfterChange = (() => {
          try {
            return editor?.getSelection?.();
          } catch {
            return null;
          }
        })();
        if (selectionAfterChange) {
          typingSelectionRef.current = selectionAfterChange;
        }
        lastRelativeContentRef.current = draftContent;
        onDraftChange?.(draftContent);
        const previousSelection = selectionAfterChange || typingSelectionRef.current;
        window.requestAnimationFrame(() => {
          try {
            const quill = getQuillEditor();
            if (!quill || !quill.hasFocus?.() || !previousSelection) return;
            const currentSelection = quill.getSelection();
            const insertedLength = Array.isArray(delta?.ops)
              ? delta.ops.reduce((total, op) => {
                if (typeof op.insert === 'string') return total + op.insert.length;
                return op.insert ? total + 1 : total;
              }, 0)
              : 0;
            const nextIndex = Math.min(
              Math.max(previousSelection.index + Math.max(insertedLength, 1), 0),
              Math.max(quill.getLength() - 1, 0)
            );

            if (currentSelection && currentSelection.index === 0 && previousSelection.index > 0) {
              setSelectionWithoutScroll(quill, nextIndex, 0, 'silent');
            }
          } catch { /* ignore */ }
        });
        return;
      }

      // --- FIX LAG & MẤT FOCUS: DEBOUNCE LƯU LÊN CHA (300ms) ---
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
      if (quillRoot) {
        syncListItemFontSizeFromChildren(quillRoot);
      }
      const syncedContent = quillRoot?.innerHTML || content;
      isUserEditingRef.current = true;
      localEditorHtmlRef.current = syncedContent;
      const relativeContent = normalizeContentForSave(syncedContent);

      if (typeof props.value === "string" && relativeContent === props.value) {
        return;
      }

      lastRelativeContentRef.current = relativeContent;
      onChangeTimeoutRef.current = setTimeout(() => {
        if (onChangeRef.current) {
          onChangeRef.current(relativeContent, delta, source, editor);
        }
      }, 300);
    }
  }, [props.value, commitOnBlurOnly, onDraftChange, getQuillEditor, setSelectionWithoutScroll, normalizeContentForSave]);
  toolbarHandlerRefs.current.handleOnChange = handleOnChange;

  const handleSelectionChange = useCallback((range) => {
    const isControlPopupOpen = showFontSizePopup || showSpacingPopup || showTranslatePopup;
    const isEditingControlPopup = isControlPopupInputActive();
    if (range) {
      typingSelectionRef.current = range;
      savedSelectionRef.current = range;
      if (range.length > 0) {
        lastHighlightSelectionRef.current = range;
        if (isMobileAdminViewport() && canUseMobileSelectionToolbar) {
          controlSelectionRef.current = { ...range };
          updateMobileSelectionToolbarPosition(range);
        }
      } else if (isMobileAdminViewport()) {
        setMobileSelectionToolbar((prev) => prev.visible ? { ...prev, visible: false } : prev);
      }
      if (isControlPopupOpen && !isEditingControlPopup) {
        controlSelectionRef.current = range.length > 0 ? { ...range } : null;
        syncSelectionControlsFromFormat(range);
      }
    } else if (isMobileAdminViewport() && !isControlPopupOpen) {
      setMobileSelectionToolbar((prev) => prev.visible ? { ...prev, visible: false } : prev);
    }
    if (!isEditingControlPopup) {
      updateSizePickerLabel(range);
    }
    if (commitOnBlurOnly && !isControlPopupOpen) return;
  }, [canUseMobileSelectionToolbar, commitOnBlurOnly, showFontSizePopup, showSpacingPopup, showTranslatePopup, syncSelectionControlsFromFormat, updateMobileSelectionToolbarPosition, updateSizePickerLabel]);

  useEffect(() => {
    if (!commitOnBlurOnly || !isReady) return;
    const quill = getQuillEditor();
    if (!quill) return;

    const rememberTypingSelection = () => {
      try {
        const selection = quill.getSelection();
        if (selection) {
          typingSelectionRef.current = selection;
        }
      } catch { /* ignore */ }
    };

    const preserveEditorInteractionScroll = () => {
      preserveAdminScrollDuring();
    };

    quill.root.addEventListener('pointerdown', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('beforeinput', rememberTypingSelection, true);
    quill.root.addEventListener('keydown', rememberTypingSelection, true);
    quill.root.addEventListener('mousedown', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('mouseup', rememberTypingSelection, true);
    quill.root.addEventListener('mouseup', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('click', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('focus', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('keyup', rememberTypingSelection, true);

    return () => {
      quill.root.removeEventListener('pointerdown', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('beforeinput', rememberTypingSelection, true);
      quill.root.removeEventListener('keydown', rememberTypingSelection, true);
      quill.root.removeEventListener('mousedown', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('mouseup', rememberTypingSelection, true);
      quill.root.removeEventListener('mouseup', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('click', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('focus', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('keyup', rememberTypingSelection, true);
    };
  }, [commitOnBlurOnly, getQuillEditor, isReady, preserveAdminScrollDuring]);

  const syncImageEditChange = useCallback((quill) => {
    if (!quill) return;
    try {
      quill.setSelection(null, 'silent');
      quill.blur();
    } catch { /* ignore */ }

    handleOnChange(quill.root.innerHTML, quill.getContents(), 'user', quill);
  }, [handleOnChange]);
  toolbarHandlerRefs.current.syncImageEditChange = syncImageEditChange;

  const applyImageMetadata = useCallback((quill, imgIndex, newData) => {
    if (imgIndex === -1 || !quill) return;

    quill.formatText(imgIndex, 1, 'alt', newData.alt || false, 'user');
    quill.formatText(imgIndex, 1, 'title', newData.title || false, 'user');
    quill.formatText(imgIndex, 1, 'caption', newData.caption || false, 'user');
    quill.formatText(imgIndex, 1, 'borderRadius', newData.borderRadius || false, 'user');
    if (newData.wrap !== undefined) {
      quill.formatText(imgIndex, 1, 'wrap', newData.wrap || 'none', 'user');
    }

    const [newBlot] = quill.getLeaf(imgIndex);
    const newImg = newBlot?.domNode?.tagName === 'IMG'
      ? newBlot.domNode
      : newBlot?.domNode?.querySelector?.('img');

    if (newImg) {
      if (newData.alt) newImg.setAttribute('alt', newData.alt);
      else newImg.removeAttribute('alt');

      if (newData.title) newImg.setAttribute('title', newData.title);
      else newImg.removeAttribute('title');

      if (newData.caption) newImg.setAttribute('data-caption', newData.caption);
      else newImg.removeAttribute('data-caption');

      if (newData.borderRadius) {
        newImg.style.borderRadius = newData.borderRadius;
        newImg.setAttribute('data-border-radius', newData.borderRadius);
      } else {
        newImg.style.borderRadius = '';
        newImg.removeAttribute('data-border-radius');
      }

      if (newData.wrap !== undefined) {
        applyImageWrapDom(newImg, newData.wrap || 'none');
      }

      requestAnimationFrame(() => {
        syncImageCaptionBlots();
      });
    }

    quill.update('user');
    syncImageEditChange(quill);
    setTimeout(() => emitCurrentContentForSaveRef.current?.(true), 0);
    setTimeout(() => {
      syncImageCaptionBlots();
    }, 100);
  }, [syncImageEditChange, syncImageCaptionBlots, applyImageWrapDom]);

  const readImageData = (img) => ({
    alt: img.getAttribute('alt') || '',
    title: img.getAttribute('title') || '',
    caption: img.getAttribute('data-caption') || '',
    borderRadius: img.style.borderRadius || img.getAttribute('data-border-radius') || '',
    wrap: img.getAttribute('data-wrap') || 'none'
  });

  const handleContainerDblClick = useCallback((ev) => {
    if (disableImageWrap || (typeof window !== 'undefined' && window.innerWidth < 768)) return;

    const clickedImg = ev.target.closest && ev.target.closest('img');
    if (!clickedImg) return;

    const quill = getQuillEditor();
    if (!quill) return;

    const src = clickedImg.getAttribute('src');
    const actualImg = Array.from(quill.root.querySelectorAll('img')).find(i => i.getAttribute('src') === src);
    if (!actualImg) return;

    const blot = findImageBlot(actualImg);
    const imgIndex = blot ? quill.getIndex(blot) : -1;

    openAltModal(readImageData(actualImg), (newData) => {
      applyImageMetadata(quill, imgIndex, newData);
    });
  }, [disableImageWrap, openAltModal, getQuillEditor, applyImageMetadata]);
  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const container = containerRef.current;
    container.addEventListener('click', handleContainerClick);
    container.addEventListener('dblclick', handleContainerDblClick);
    return () => {
      container.removeEventListener('click', handleContainerClick);
      container.removeEventListener('dblclick', handleContainerDblClick);
    };
  }, [isReady, handleContainerClick, handleContainerDblClick]);

  const customModules = React.useMemo(() => {
    if (!modules) return null;
    const mods = { ...modules };
    let newToolbar = mods.toolbar;
    if (mods.toolbar && Array.isArray(mods.toolbar)) {
      newToolbar = mods.toolbar.map(group => {
        if (Array.isArray(group) && group.includes('image')) {
          const newGroup = [...group];
          if (!disableImageWrap && !newGroup.includes('image-settings')) {
            newGroup.push('image-settings');
          }
          const showSpacingAndTranslation = hasLineHeight || hasTranslateY;
          if (showSpacingAndTranslation) {
            if (!newGroup.includes('line-height')) {
              newGroup.push('line-height');
            }
            if (!newGroup.includes('translate-y')) {
              newGroup.push('translate-y');
            }
          } else {
            return newGroup.filter(item => item !== 'line-height' && item !== 'translate-y');
          }
          return newGroup;
        }
        return group;
      });
    }
    const openResponsiveColorPicker = (quill, formatName, device) => {
      const range = quill.getSelection()
        || controlSelectionRef.current
        || lastHighlightSelectionRef.current
        || savedSelectionRef.current
        || typingSelectionRef.current;
      if (range) savedSelectionRef.current = { ...range };

      const currentFormat = range ? quill.getFormat(range) : quill.getFormat();
      const currentColor = currentFormat?.[formatName];
      const initialColor = /^#[0-9a-f]{6}$/i.test(currentColor || '') ? currentColor : '#000000';

      const applyPickedColor = (nextColor) => {
        if (!/^#[0-9a-f]{6}$/i.test(nextColor || '')) return;
        const apply = () => {
          if (range?.length > 0) {
            quill.formatText(range.index, range.length, formatName, nextColor, 'user');
          } else if (disableImageWrap && quill.getLength?.() > 1) {
            quill.formatText(0, Math.max(quill.getLength() - 1, 0), formatName, nextColor, 'user');
          } else {
            if (range) setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
            quill.format(formatName, nextColor, 'user');
          }
        };
        preserveEditorScrollDuring(apply);
        const html = quill.root.innerHTML;
        localEditorHtmlRef.current = html;
        if (commitOnBlurOnly) {
          lastRelativeContentRef.current = html;
          onDraftChangeRef.current?.(html);
        } else {
          window.setTimeout(() => {
            toolbarHandlerRefs.current.handleOnChange?.(quill.root.innerHTML, quill.getContents(), 'user', quill);
          }, 0);
        }
      };

      const button = containerRef.current?.querySelector(`.ql-color-${device}-custom`);
      const rect = button?.getBoundingClientRect();
      const popupWidth = 240;
      const left = Math.max(12, Math.min(rect?.left || 12, window.innerWidth - popupWidth - 12));
      const top = Math.max(12, Math.min((rect?.bottom || 12) + 8, window.innerHeight - 300));
      setResponsiveColorPopup({
        visible: true,
        top,
        left,
        value: initialColor,
        device,
        applyColor: applyPickedColor,
      });
    };

    mods.toolbar = {
      container: newToolbar,
      handlers: {
        'color-desktop-custom': function () {
          openResponsiveColorPicker(this.quill, 'color', 'desktop');
        },
        'color-mobile-custom': function () {
          openResponsiveColorPicker(this.quill, 'colorMobile', 'mobile');
        },
        font: function (value) {
          const quill = this.quill;
          const nextValue = value && value !== 'macdinh' ? value : false;
          const range = quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;

          if (disableImageWrap && quill.getLength?.() > 1 && (!range || range.length === 0)) {
            quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'font', nextValue, 'user');
          }

          if (range) {
            try {
              focusWithoutScroll(quill);
              setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
              savedSelectionRef.current = range;
            } catch { /* ignore */ }
            if (range.length > 0) {
              quill.formatText(range.index, range.length, 'font', nextValue, 'user');
            }
          }

          quill.format('font', nextValue, 'user');
          if (nextValue) {
            lastActiveFormatsRef.current = { ...lastActiveFormatsRef.current, font: nextValue };
          } else {
            lastActiveFormatsRef.current = {};
          }
          const html = quill.root.innerHTML;
          localEditorHtmlRef.current = html;
          if (commitOnBlurOnly) {
            lastRelativeContentRef.current = html;
            onDraftChangeRef.current?.(html);
          }
          window.setTimeout(updateSizePickerLabel, 0);

          const syncFontPickerDisplay = () => {
            const picker = containerRef.current?.querySelector('.ql-font.ql-picker');
            const label = picker?.querySelector('.ql-picker-label');
            const selectedValue = nextValue || DEFAULT_FONT_VALUE;
            picker?.querySelectorAll('.ql-picker-item.ql-selected').forEach((item) => {
              item.classList.remove('ql-selected');
              item.removeAttribute('aria-selected');
            });
            const selectedItem = picker?.querySelector(`.ql-picker-item${selectedValue ? `[data-value="${escapeCssAttributeValue(selectedValue)}"]` : ':not([data-value])'}`);
            selectedItem?.classList.add('ql-selected');
            selectedItem?.setAttribute('aria-selected', 'true');
            if (selectedValue) {
              label?.setAttribute('data-value', selectedValue);
            } else {
              label?.removeAttribute('data-value');
            }
          };

          window.setTimeout(() => {
            try {
              localEditorHtmlRef.current = quill.root.innerHTML;
              toolbarHandlerRefs.current.handleOnChange?.(quill.root.innerHTML, quill.getContents(), 'user', quill);
              updateSizePickerLabel();
              syncFontPickerDisplay();
              window.setTimeout(syncFontPickerDisplay, 80);
            } catch { /* ignore */ }
          }, 0);
        },
        'font-size-custom': function () {
          const button = containerRef.current?.querySelector('.ql-font-size-custom');
          if (button && containerRef.current) {
            preserveEditorScrollDuring(() => {
              toolbarHandlerRefs.current.commitControlDrafts?.();
              closeAllToolbarPickers();
              clearPopupInputValues();
              const qSel = this.quill?.getSelection?.();
              const currentSelection = qSel || savedSelectionRef.current || typingSelectionRef.current;
              const finalSelection = getCurrentControlSelection(currentSelection);
              controlSelectionRef.current = finalSelection;
              toolbarHandlerRefs.current.syncSelectionControlsFromFormat?.(finalSelection);

              window.setTimeout(() => {
                setPopupValueVersion((prev) => prev + 1);
              }, 0);

              controlPopupAnchorRef.current.fontSize = button;
              setFontSizePopupPosition(getClampedControlPopupPosition(button, 210, 'fontSize', 230));
              setShowSpacingPopup(false);
              setShowTranslatePopup(false);
              setShowFontSizePopup(true);
              clearMobileNativeSelectionOverlay(finalSelection);
            });
          }
        },
        'line-height': function () {
          const button = containerRef.current?.querySelector('.ql-line-height');
          if (button && containerRef.current) {
            preserveEditorScrollDuring(() => {
              toolbarHandlerRefs.current.commitControlDrafts?.();
              closeAllToolbarPickers();
              clearPopupInputValues();
              const currentSelection = this.quill?.getSelection?.() || savedSelectionRef.current || typingSelectionRef.current;
              const finalSelection = getCurrentControlSelection(currentSelection);
              controlSelectionRef.current = finalSelection;
              toolbarHandlerRefs.current.syncSelectionControlsFromFormat?.(finalSelection);
              controlPopupAnchorRef.current.lineHeight = button;
              setPopupPosition(getClampedControlPopupPosition(button, 200, 'lineHeight', 220));
              setShowFontSizePopup(false);
              setShowTranslatePopup(false);
              setShowSpacingPopup(true);
              clearMobileNativeSelectionOverlay(finalSelection);
            });
          }
        },
        'translate-y': function () {
          const button = containerRef.current?.querySelector('.ql-translate-y');
          if (button && containerRef.current) {
            preserveEditorScrollDuring(() => {
              toolbarHandlerRefs.current.commitControlDrafts?.();
              closeAllToolbarPickers();
              clearPopupInputValues();
              const currentSelection = this.quill?.getSelection?.() || savedSelectionRef.current || typingSelectionRef.current;
              const finalSelection = getCurrentControlSelection(currentSelection);
              controlSelectionRef.current = finalSelection;
              toolbarHandlerRefs.current.syncSelectionControlsFromFormat?.(finalSelection);
              controlPopupAnchorRef.current.translateY = button;
              setTranslatePopupPosition(getClampedControlPopupPosition(button, 200, 'translateY', 220));
              setShowFontSizePopup(false);
              setShowSpacingPopup(false);
              setShowTranslatePopup(true);
              clearMobileNativeSelectionOverlay(finalSelection);
            });
          }
        },
        more: function () {
          const toolbarEl = this.container || this.quill.root.parentNode.querySelector('.ql-toolbar');
          if (toolbarEl) {
            const now = window.performance?.now?.() || Date.now();
            if (toolbarEl.__lastMoreToggleAt && now - toolbarEl.__lastMoreToggleAt < 120) {
              return;
            }
            toolbarEl.__lastMoreToggleAt = now;

            if (controlPopupOpenRef.current) {
              controlPopupOpenRef.current = false;
              setShowFontSizePopup(false);
              setShowSpacingPopup(false);
              setShowTranslatePopup(false);
              toolbarEl.classList.remove('ql-control-popup-open');
              toolbarEl.classList.add('ql-toolbar-expanded');
              return;
            }
            toolbarEl.classList.toggle('ql-toolbar-expanded');
          }
        },
        image: function () {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        },
        'image-settings': function () {
          const quill = this.quill;

          let targetImg = resolveImageElement(selectedImageRef.current);
          let imgIndex = -1;

          if (targetImg) {
            const blot = findImageBlot(targetImg);
            imgIndex = blot ? quill.getIndex(blot) : -1;
          } else {
            const range = quill.getSelection();
            if (range) {
              const [leaf] = quill.getLeaf(range.index);
              const leafImg = leaf?.domNode?.tagName === 'IMG'
                ? leaf.domNode
                : leaf?.domNode?.querySelector?.('img');
              if (leafImg) {
                targetImg = leafImg;
                const blot = findImageBlot(leafImg);
                imgIndex = blot ? quill.getIndex(blot) : range.index;
              }
            }
          }

          if (!targetImg || imgIndex === -1) {
            showAlert("Please select an image before editing image properties.");
            return;
          }

          openAltModal(readImageData(targetImg), (newData) => {
            applyImageMetadata(quill, imgIndex, newData);
          });
        },
        align: function (value) {
          const quill = this.quill;
          const currentImg = getActiveImage();

          if (currentImg && quill?.root?.contains(currentImg)) {
            const mode = value === 'right' ? 'right' : value === 'center' ? 'none' : 'left';
            const wrapMode = applyImageWrapDom(currentImg, mode);
            toolbarHandlerRefs.current.syncImageEditChange?.(quill);

            setImageWrapMode(wrapMode);
            setTimeout(() => {
              updateResizerRect();
              syncImageCaptionBlots();
              positionResizerDirectly();
            }, 50);
            return;
          }

          const range = quill.getSelection() || savedSelectionRef.current;
          if (range) {
            try {
              setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
            } catch { /* ignore */ }
          }
          quill.format('align', value, 'user');
          window.setTimeout(() => {
            try {
              localEditorHtmlRef.current = quill.root.innerHTML;
              toolbarHandlerRefs.current.handleOnChange?.(quill.root.innerHTML, quill.getContents(), 'user', quill);
            } catch { /* ignore */ }
          }, 0);
        },
        color: function (value) {
          const quill = this.quill;
          const syncColorContent = () => {
            const html = quill.root.innerHTML;
            localEditorHtmlRef.current = html;
            if (commitOnBlurOnly) {
              lastRelativeContentRef.current = html;
              onDraftChangeRef.current?.(html);
              return;
            }
            window.setTimeout(() => {
              try {
                toolbarHandlerRefs.current.handleOnChange?.(quill.root.innerHTML, quill.getContents(), 'user', quill);
              } catch { /* ignore */ }
            }, 0);
          };
          const applyColor = (nextValue, options = {}) => {
            const {
              preserveNativePickerFocus = false,
              rangeOverride = null,
              source = 'user',
              syncContent = true,
            } = options;
            const range = rangeOverride || quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;
            const applyFormat = () => {
              if (range?.length > 0) {
                try {
                  if (!preserveNativePickerFocus && !isMobileAdminViewport()) {
                    focusWithoutScroll(quill);
                  }
                  if (!preserveNativePickerFocus) {
                    setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                  }
                  savedSelectionRef.current = range;
                } catch { /* ignore */ }
                if (preserveNativePickerFocus) {
                  quill.formatText(range.index, range.length, 'color', nextValue || false, source);
                } else {
                  quill.format('color', nextValue || false, source);
                }
              } else if (disableImageWrap && quill.getLength?.() > 1) {
                quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'color', nextValue || false, source);
              } else {
                if (range) {
                  try {
                    if (!isMobileAdminViewport()) {
                      focusWithoutScroll(quill);
                    }
                    setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                    savedSelectionRef.current = range;
                  } catch { /* ignore */ }
                }
                quill.format('color', nextValue || false, source);
              }
            };
            if (preserveNativePickerFocus) {
              applyFormat();
            } else {
              preserveEditorScrollDuring(applyFormat);
            }
            if (syncContent) {
              syncColorContent();
            }
          };

          if (value === 'no-color') {
            applyColor(false);
          } else if (value === 'custom-color') {
            const isMobilePicker = isMobileAdminViewport();
            const customColorRange = quill.getSelection() || controlSelectionRef.current || lastHighlightSelectionRef.current || savedSelectionRef.current || typingSelectionRef.current;
            if (customColorRange) {
              savedSelectionRef.current = { ...customColorRange };
              if (customColorRange.length > 0) {
                lastHighlightSelectionRef.current = { ...customColorRange };
              }
            }
            let picker = document.getElementById('quill-custom-color-picker');
            if (!picker) {
              picker = document.createElement('input');
              picker.id = 'quill-custom-color-picker';
              picker.type = 'color';
              picker.style.position = 'fixed';
              picker.style.width = '44px';
              picker.style.height = '32px';
              picker.style.opacity = '0.01';
              picker.style.pointerEvents = 'auto';
              picker.style.zIndex = '2147483647';
              document.body.appendChild(picker);
            }
            if (picker.dataset.quillPickerEventsBound !== 'true') {
              picker.dataset.quillPickerEventsBound = 'true';
              ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'].forEach((eventName) => {
                picker.addEventListener(eventName, (event) => {
                  event.stopPropagation();
                }, true);
              });
            }
            // Mobile browsers often block the native color dialog for fully
            // hidden inputs, so keep this input tangible and place it where the
            // user just tapped.
            const expandedPicker = document.querySelector('.ql-color.ql-expanded');
            if (expandedPicker) {
              const customColorItem = expandedPicker.querySelector('[data-value="custom-color"]');
              const rect = (customColorItem || expandedPicker).getBoundingClientRect();
              picker.style.top = `${rect.top}px`;
              picker.style.left = `${rect.left}px`;
              picker.style.width = `${Math.max(rect.width, 44)}px`;
              picker.style.height = `${Math.max(rect.height, 32)}px`;
            }
            const currentFormat = this.quill.getFormat();
            if (currentFormat && currentFormat.color && currentFormat.color.startsWith('#')) {
              picker.value = currentFormat.color;
            }
            let lastRenderedColor = picker.value;
            let lastCommittedColor = picker.value;
            const renderPickedColor = () => {
              if (picker.value === lastRenderedColor) return;
              lastRenderedColor = picker.value;
              applyColor(picker.value, {
                preserveNativePickerFocus: isMobilePicker,
                rangeOverride: customColorRange ? { ...customColorRange } : null,
                source: isMobilePicker ? 'silent' : 'user',
                syncContent: !isMobilePicker,
              });
            };
            const commitPickedColor = () => {
              renderPickedColor();
              if (picker.value === lastCommittedColor) return;
              lastCommittedColor = picker.value;
              if (isMobilePicker) {
                syncColorContent();
              }
            };
            picker.oninput = renderPickedColor;
            picker.onchange = commitPickedColor;
            picker.onblur = () => {
              window.setTimeout(commitPickedColor, 0);
            };
            picker.focus({ preventScroll: true });
            try {
              if (typeof picker.showPicker === 'function') {
                picker.showPicker();
              } else {
                picker.click();
              }
            } catch {
              picker.click();
            }
          } else {
            applyColor(value);
          }
        },
        colorMobile: function (value) {
          const quill = this.quill;
          const range = quill.getSelection()
            || controlSelectionRef.current
            || lastHighlightSelectionRef.current
            || savedSelectionRef.current
            || typingSelectionRef.current;

          if (range) {
            savedSelectionRef.current = { ...range };
          }

          const syncContent = () => {
            const html = quill.root.innerHTML;
            localEditorHtmlRef.current = html;
            if (commitOnBlurOnly) {
              lastRelativeContentRef.current = html;
              onDraftChangeRef.current?.(html);
              return;
            }
            window.setTimeout(() => {
              toolbarHandlerRefs.current.handleOnChange?.(quill.root.innerHTML, quill.getContents(), 'user', quill);
            }, 0);
          };

          const applyMobileColor = (nextValue) => {
            const apply = () => {
              if (range?.length > 0) {
                quill.formatText(range.index, range.length, 'colorMobile', nextValue || false, 'user');
              } else if (disableImageWrap && quill.getLength?.() > 1) {
                quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'colorMobile', nextValue || false, 'user');
              } else {
                if (range) {
                  setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                }
                quill.format('colorMobile', nextValue || false, 'user');
              }
            };
            preserveEditorScrollDuring(apply);
            syncContent();
          };

          if (value === 'no-color') {
            applyMobileColor(false);
            return;
          }

          if (value !== 'custom-color') {
            applyMobileColor(value);
            return;
          }

          let picker = document.getElementById('quill-custom-mobile-color-picker');
          if (!picker) {
            picker = document.createElement('input');
            picker.id = 'quill-custom-mobile-color-picker';
            picker.type = 'color';
            picker.style.position = 'fixed';
            picker.style.width = '44px';
            picker.style.height = '32px';
            picker.style.opacity = '0.01';
            picker.style.pointerEvents = 'auto';
            picker.style.zIndex = '2147483647';
            document.body.appendChild(picker);
          }

          const expandedPicker = containerRef.current?.querySelector('.ql-colorMobile.ql-expanded');
          if (expandedPicker) {
            const rect = (expandedPicker.querySelector('[data-value="custom-color"]') || expandedPicker).getBoundingClientRect();
            picker.style.top = `${rect.top}px`;
            picker.style.left = `${rect.left}px`;
          }

          const currentColor = range ? quill.getFormat(range).colorMobile : '';
          if (/^#[0-9a-f]{6}$/i.test(currentColor || '')) {
            picker.value = currentColor;
          }
          picker.oninput = () => applyMobileColor(picker.value);
          picker.onchange = () => applyMobileColor(picker.value);
          try {
            picker.showPicker?.();
            if (!picker.showPicker) picker.click();
          } catch {
            picker.click();
          }
        },
        background: function (value) {
          const quill = this.quill;
          const syncBackgroundContent = () => {
            const html = quill.root.innerHTML;
            localEditorHtmlRef.current = html;
            if (commitOnBlurOnly) {
              lastRelativeContentRef.current = html;
              onDraftChangeRef.current?.(html);
              return;
            }
            window.setTimeout(() => {
              try {
                toolbarHandlerRefs.current.handleOnChange?.(quill.root.innerHTML, quill.getContents(), 'user', quill);
              } catch { /* ignore */ }
            }, 0);
          };
          const applyBackground = (nextValue, options = {}) => {
            const {
              preserveNativePickerFocus = false,
              rangeOverride = null,
              source = 'user',
              syncContent = true,
            } = options;
            const range = rangeOverride || quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;
            const applyFormat = () => {
              if (range?.length > 0) {
                try {
                  if (!preserveNativePickerFocus && !isMobileAdminViewport()) {
                    focusWithoutScroll(quill);
                  }
                  if (!preserveNativePickerFocus) {
                    setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                  }
                  savedSelectionRef.current = range;
                } catch { /* ignore */ }
                if (preserveNativePickerFocus) {
                  quill.formatText(range.index, range.length, 'background', nextValue || false, source);
                } else {
                  quill.format('background', nextValue || false, source);
                }
              } else if (disableImageWrap && quill.getLength?.() > 1) {
                quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'background', nextValue || false, source);
              } else {
                if (range) {
                  try {
                    if (!isMobileAdminViewport()) {
                      focusWithoutScroll(quill);
                    }
                    setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                    savedSelectionRef.current = range;
                  } catch { /* ignore */ }
                }
                quill.format('background', nextValue || false, source);
              }
            };
            if (preserveNativePickerFocus) {
              applyFormat();
            } else {
              preserveEditorScrollDuring(applyFormat);
            }
            if (syncContent) {
              syncBackgroundContent();
            }
          };

          if (value === 'no-color') {
            applyBackground(false);
          } else if (value === 'custom-color') {
            const isMobilePicker = isMobileAdminViewport();
            const customBackgroundRange = quill.getSelection() || controlSelectionRef.current || lastHighlightSelectionRef.current || savedSelectionRef.current || typingSelectionRef.current;
            if (customBackgroundRange) {
              savedSelectionRef.current = { ...customBackgroundRange };
              if (customBackgroundRange.length > 0) {
                lastHighlightSelectionRef.current = { ...customBackgroundRange };
              }
            }
            let picker = document.getElementById('quill-custom-bg-picker');
            if (!picker) {
              picker = document.createElement('input');
              picker.id = 'quill-custom-bg-picker';
              picker.type = 'color';
              picker.style.position = 'fixed';
              picker.style.width = '44px';
              picker.style.height = '32px';
              picker.style.opacity = '0.01';
              picker.style.pointerEvents = 'auto';
              picker.style.zIndex = '2147483647';
              document.body.appendChild(picker);
            }
            if (picker.dataset.quillPickerEventsBound !== 'true') {
              picker.dataset.quillPickerEventsBound = 'true';
              ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'].forEach((eventName) => {
                picker.addEventListener(eventName, (event) => {
                  event.stopPropagation();
                }, true);
              });
            }
            // Mobile browsers often block the native color dialog for fully
            // hidden inputs, so keep this input tangible and place it where the
            // user just tapped.
            const expandedPicker = document.querySelector('.ql-background.ql-expanded');
            if (expandedPicker) {
              const customColorItem = expandedPicker.querySelector('[data-value="custom-color"]');
              const rect = (customColorItem || expandedPicker).getBoundingClientRect();
              picker.style.top = `${rect.top}px`;
              picker.style.left = `${rect.left}px`;
              picker.style.width = `${Math.max(rect.width, 44)}px`;
              picker.style.height = `${Math.max(rect.height, 32)}px`;
            }
            const currentFormat = this.quill.getFormat();
            if (currentFormat && currentFormat.background && currentFormat.background.startsWith('#')) {
              picker.value = currentFormat.background;
            }
            let lastRenderedBackground = picker.value;
            let lastCommittedBackground = picker.value;
            const renderPickedBackground = () => {
              if (picker.value === lastRenderedBackground) return;
              lastRenderedBackground = picker.value;
              applyBackground(picker.value, {
                preserveNativePickerFocus: isMobilePicker,
                rangeOverride: customBackgroundRange ? { ...customBackgroundRange } : null,
                source: isMobilePicker ? 'silent' : 'user',
                syncContent: !isMobilePicker,
              });
            };
            const commitPickedBackground = () => {
              renderPickedBackground();
              if (picker.value === lastCommittedBackground) return;
              lastCommittedBackground = picker.value;
              if (isMobilePicker) {
                syncBackgroundContent();
              }
            };
            picker.oninput = renderPickedBackground;
            picker.onchange = commitPickedBackground;
            picker.onblur = () => {
              window.setTimeout(commitPickedBackground, 0);
            };
            picker.focus({ preventScroll: true });
            try {
              if (typeof picker.showPicker === 'function') {
                picker.showPicker();
              } else {
                picker.click();
              }
            } catch {
              picker.click();
            }
          } else {
            applyBackground(value);
          }
        }
      }
    };
    return mods;
  }, [
    modules,
    disableImageWrap,
    hasLineHeight,
    hasTranslateY,
    applyImageWrapDom,
    getActiveImage,
    focusWithoutScroll,
    setSelectionWithoutScroll,
    updateResizerRect,
    syncImageCaptionBlots,
    updateSizePickerLabel,
    positionResizerDirectly,
    resolveImageElement,
    clearPopupInputValues,
    clearMobileNativeSelectionOverlay,
    closeAllToolbarPickers,
    getClampedControlPopupPosition,
    getCurrentControlSelection,
    syncSelectionControlsFromFormat,
    preserveEditorScrollDuring
  ]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const quill = getQuillEditor();
    if (!quill) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${URL_API}api/upload/image`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.uploaded) {
        const range = quill.getSelection(true);
        const imageSrc = result.url.startsWith("/") ? `${URL_API}${result.url.substring(1)}` : result.url;
        quill.insertEmbed(range.index, "image", {
          src: imageSrc,
          alt: "",
          title: "",
          caption: "",
          borderRadius: "",
          wrap: "none"
        }, "user");
        quill.setSelection(range.index + 1);
        setTimeout(() => emitCurrentContentForSave(true), 0);
      } else {
        showAlert("Image upload failed");
      }
    } catch (error) {
      console.error(error);
      showAlert("Connection failed");
    } finally {
      e.target.value = "";
    }
  };

  const handleResizeStart = useCallback((event, direction, imageOverride = null) => {
    event.preventDefault();
    event.stopPropagation();
    if (resizeDragRef.current) return;

    const startImg = resolveImageElement(imageOverride) || getActiveImage() || resolveImageElement(selectedImage);
    const quill = getQuillEditor();
    const editor = containerRef.current?.querySelector('.ql-editor');
    if (!startImg || !startImg.isConnected || !editor) return;

    const resizeImageSrc = startImg.getAttribute('src') || "";
    let liveResizeImage = startImg;
    const getResizeImage = () => {
      if (liveResizeImage && liveResizeImage.isConnected && liveResizeImage.getBoundingClientRect().width > 0) {
        return liveResizeImage;
      }

      if (resizeImageSrc) {
        const match = Array.from(editor.querySelectorAll('img')).find((candidate) => (
          candidate.getAttribute('src') === resizeImageSrc && candidate.getBoundingClientRect().width > 0
        ));
        if (match) {
          liveResizeImage = match;
          rememberSelectedImage(match);
          return match;
        }
      }

      const selected = getActiveImage();
      if (selected && selected.isConnected) {
        liveResizeImage = selected;
        return selected;
      }

      return liveResizeImage;
    };

    resizeDragRef.current = true;
    enterImageEditMode(startImg, quill);

    const startRect = startImg.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const minWidth = Math.min(24, Math.max(1, editorRect.width || startRect.width || 1));
    const maxWidth = Math.max(minWidth, editor.clientWidth || editorRect.width || startRect.width || minWidth);
    const startWidth = Math.max(minWidth, Math.min(startRect.width || startImg.clientWidth || minWidth, maxWidth));
    const startHeight = Math.max(1, startRect.height || startImg.clientHeight || 1);
    const aspectRatio = startWidth / startHeight;
    const startX = event.clientX;
    const startY = event.clientY;
    const isLeftHandle = direction.includes('left');
    const isTopHandle = direction.includes('top');
    const pointerId = event.pointerId;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    let currentWidth = startWidth;
    let frameId = 0;
    let didCommit = false;

    const syncOverlayStateToImage = () => {
      const img = getResizeImage();
      if (!img || !img.isConnected) return;
      const imgRect = img.getBoundingClientRect();
      const width = Math.max(0, imgRect.width);
      const height = Math.max(0, imgRect.height);

      setResizerRect((prev) => {
        const next = {
          top: imgRect.top,
          left: imgRect.left,
          width,
          height
        };
        return (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) ? prev : next;
      });
    };

    const scheduleChromeSync = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        positionResizerDirectly();
      });
    };

    const setImageWidth = (width, unit = 'px') => {
      const value = unit === '%' ? `${width}%` : `${Math.round(width)}px`;
      const img = getResizeImage();
      if (!img || !img.isConnected) return;
      img.style.setProperty('width', value, 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.setAttribute('width', value);
      liveResizeImage = img;
    };

    const isCenteredImage = () => {
      const img = getResizeImage();
      if (!img) return false;
      const wrapMode = img.getAttribute('data-wrap') || 'none';
      if (wrapMode !== 'none') return false;
      const style = window.getComputedStyle(img);
      return style.display === 'block' && style.marginLeft === 'auto' && style.marginRight === 'auto';
    };

    const applyPointerPosition = (clientX, clientY) => {
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      const edgeMultiplier = isCenteredImage() ? 2 : 1;
      const nextWidthFromX = isLeftHandle
        ? startWidth - (deltaX * edgeMultiplier)
        : startWidth + (deltaX * edgeMultiplier);
      const nextHeight = isTopHandle ? startHeight - deltaY : startHeight + deltaY;
      const nextWidthFromY = nextHeight * aspectRatio;
      const xWeight = Math.abs(deltaX);
      const yWeight = Math.abs(deltaY);
      const nextWidth = yWeight > xWeight ? nextWidthFromY : nextWidthFromX;
      currentWidth = Math.max(minWidth, Math.min(nextWidth, maxWidth));
      setImageWidth(currentWidth);
      scheduleChromeSync();
    };

    const commitResize = () => {
      if (didCommit) return;
      didCommit = true;

      const widthValue = `${Math.round(currentWidth)}px`;
      const img = getResizeImage();
      if (!img || !img.isConnected) return;
      img.style.setProperty('width', widthValue, 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.setAttribute('width', widthValue);
      liveResizeImage = img;

      if (quill) {
        syncImageEditChange(quill);
      }

      updateResizerRect();
      positionResizerDirectly();
    };

    const cleanup = (shouldCommit = true) => {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onEnd, true);
      document.removeEventListener('pointercancel', onCancel, true);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onEnd, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('pointercancel', onCancel, true);
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onEnd, true);
      if (typeof pointerId === 'number') {
        try {
          event.currentTarget?.releasePointerCapture?.(pointerId);
        } catch { /* ignore */ }
      }
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      resizeDragRef.current = false;
      if (shouldCommit) {
        commitResize();
      }
      imageResizeSessionRef.current = null;
    };

    function onMove(moveEvent) {
      if (
        typeof pointerId === 'number' &&
        typeof moveEvent.pointerId === 'number' &&
        moveEvent.pointerId !== pointerId
      ) return;
      moveEvent.preventDefault();
      applyPointerPosition(moveEvent.clientX, moveEvent.clientY);
    }

    function onEnd(endEvent) {
      if (
        typeof pointerId === 'number' &&
        typeof endEvent.pointerId === 'number' &&
        endEvent.pointerId !== pointerId
      ) return;
      endEvent.preventDefault();
      cleanup(true);
    }

    function onCancel(cancelEvent) {
      if (
        typeof pointerId === 'number' &&
        typeof cancelEvent.pointerId === 'number' &&
        cancelEvent.pointerId !== pointerId
      ) return;
      cleanup(true);
    }

    document.body.style.cursor = direction.includes('right') === direction.includes('top') ? 'nesw-resize' : 'nwse-resize';
    document.body.style.userSelect = 'none';
    setImageWidth(currentWidth);
    syncOverlayStateToImage();
    positionResizerDirectly();

    try {
      event.currentTarget?.setPointerCapture?.(pointerId);
    } catch { /* ignore */ }


    imageResizeSessionRef.current = { cleanup };
    if (typeof pointerId === 'number') {
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onEnd, true);
      document.addEventListener('pointercancel', onCancel, true);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onEnd, true);
      window.addEventListener('pointercancel', onCancel, true);
    } else {
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onEnd, true);
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('mouseup', onEnd, true);
    }
  }, [
    enterImageEditMode,
    getActiveImage,
    rememberSelectedImage,
    positionResizerDirectly,
    resolveImageElement,
    selectedImage,
    syncImageEditChange,
    updateResizerRect
  ]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const container = containerRef.current;

    const activateImageFromPointer = (event) => {
      if (resizerOverlayRef.current?.contains(event.target)) return;

      const img = event.target.closest && event.target.closest('img');
      const quill = getQuillEditor();
      if (!quill || !quill.root.contains(event.target)) return;

      if (!img || !quill.root.contains(img)) {
        if (selectedImageRef.current) {
          rememberSelectedImage(null);
          setResizerRect(null);
          window.setTimeout(() => {
            syncImageCaptionBlots();
          }, 50);
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      enterImageEditMode(img, quill);

      window.requestAnimationFrame(() => {
        updateResizerRect();
        positionResizerDirectly();
      });
    };

    container.addEventListener('pointerdown', activateImageFromPointer, true);
    container.addEventListener('mousedown', activateImageFromPointer, true);
    return () => {
      container.removeEventListener('pointerdown', activateImageFromPointer, true);
      container.removeEventListener('mousedown', activateImageFromPointer, true);
    };
  }, [
    enterImageEditMode,
    getQuillEditor,
    isReady,
    rememberSelectedImage,
    positionResizerDirectly,
    syncImageCaptionBlots,
    updateResizerRect
  ]);
  useEffect(() => {
    return () => {
      imageResizeSessionRef.current?.cleanup?.(false);
    };
  }, []);

  const handleImageWrap = useCallback((mode) => {
    const img = getActiveImage();
    if (!img) return;
    const quill = getQuillEditor();
    if (!quill) return;

    const wrapMode = applyImageWrapDom(img, mode);
    syncImageEditChange(quill);
    setImageWrapMode(wrapMode);
    setTimeout(() => {
      updateResizerRect();
      syncImageCaptionBlots();
      positionResizerDirectly();
    }, 50);
  }, [getActiveImage, getQuillEditor, applyImageWrapDom, syncImageEditChange, updateResizerRect, syncImageCaptionBlots, positionResizerDirectly]);

  const handleDeleteImage = useCallback(() => {
    const img = getActiveImage();
    if (!img) return;
    const quill = getQuillEditor();
    if (!quill) return;
    const blot = findImageBlot(img);
    if (blot) {
      const index = quill.getIndex(blot);
      quill.deleteText(index, 1, 'user');
    } else {
      img.remove();
    }
    syncImageEditChange(quill);
    rememberSelectedImage(null);
    setResizerRect(null);
    setTimeout(() => {
      syncImageCaptionBlots();
    }, 50);
  }, [getActiveImage, getQuillEditor, syncImageEditChange, rememberSelectedImage, syncImageCaptionBlots]);

  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeleteImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedImage, handleDeleteImage]);

  const renderModals = () => {
    if (!isMounted) return null;
    return (
      <>
        <Modal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          title="Notice"
          maxWidth="max-w-sm"
        >
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">{alertConfig.message}</p>
            <Button
              onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
              className="w-full py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-blue-100"
            >
              Got it
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thông tin ảnh"
          className="z-[20000]"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Văn bản thay thế (SEO)</label>
              <input
                type="text"
                placeholder="Ví dụ: phòng học cho thuê tại Đà Nẵng..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.alt}
                onChange={(e) => setModalData({ ...modalData, alt: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Chú thích khi rê chuột (Title)</label>
              <input
                type="text"
                placeholder="Ví dụ: nội dung hiển thị khi rê chuột vào ảnh..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.title}
                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Chú thích hiển thị dưới ảnh</label>
              <input
                type="text"
                placeholder="Ví dụ: không gian phòng học hiện đại..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.caption}
                onChange={(e) => setModalData({ ...modalData, caption: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Bo góc ảnh (ví dụ: 8px, 16px, 50%)</label>
              <input
                type="text"
                placeholder="Ví dụ: 12px hoặc 24px..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.borderRadius || ""}
                onChange={(e) => setModalData({ ...modalData, borderRadius: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-50 hover:text-red-500 transition-all active:scale-95"
              >
                Hủy</button>
              <Button
                type="button"
                onClick={() => handleModalSubmit()}
                className="flex-1 px-6 py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  const absoluteValue = useMemo(() => {
    if (!props.value || typeof props.value !== 'string') return props.value;
    const whitespaceOptions = { preserveWhitespaceOnly: preserveWhitespaceOnlyBlocks };
    let val = normalizeResponsiveLineHeightStyles(unwrapRichTextControlsForEdit(
      removeEmptyQuillParagraphs(stripEditorCaptionArtifacts(props.value), whitespaceOptions)
    )).replace(/src=["']\/(assets\/[^"']+)["']/gi, `src="${URL_API}$1"`);
    if (shouldNormalizeExcessiveIndent) {
      val = normalizeExcessiveLeadingWhitespaceAlignment(val);
    }
    if (preserveWhitespaceOnlyBlocks) {
      val = normalizeWhitespaceOnlyBlocksForQuill(val);
    }
    if (preserveInlineWhitespace) {
      val = preserveSignificantInlineWhitespaceForQuill(val);
    }

    const cleanBlockStyleString = (styleStr, tag = '') => {
      return styleStr
        .split(';')
        .map(part => part.trim())
        .filter(part => {
          if (!part) return false;
          const lower = part.toLowerCase();
          if (tag.toLowerCase() === 'li' && (lower.startsWith('--fs-desktop') || lower.startsWith('--fs-mobile'))) {
            return true;
          }
          return (
            !lower.startsWith('--fs-desktop') &&
            !lower.startsWith('--fs-mobile') &&
            !lower.startsWith('--custom-line-height') &&
            !lower.startsWith('--custom-line-height-mobile') &&
            !lower.startsWith('--translate-y') &&
            !lower.startsWith('--translate-y-mobile')
          );
        })
        .join('; ');
    };

    // Clean block styles
    val = val.replace(/<(p|li|h1|h2|h3|h4|h5|h6)\b([^>]*?)style=(["'])([^"']*?)\3([^>]*?)>/gi, (match, tag, before, quote, styleContent, after) => {
      const cleaned = cleanBlockStyleString(styleContent, tag);
      return cleaned ? `<${tag}${before}style=${quote}${cleaned}${quote}${after}>` : `<${tag}${before}${after}>`;
    });

    const shouldStripInlineFontSize = hasResponsive || isSimpleTextField;
    if (shouldStripInlineFontSize) {
      val = val.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
        const cleaned = stripFontSizeFromStyle(styleContent);
        return cleaned ? `style=${quote}${cleaned}${quote}` : "";
      });
    } else {
      // Clean up any dirty database styles before loading into the editor
      val = val.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
        const cleaned = cleanStyleForEdit(styleContent);
        return cleaned ? `style=${quote}${cleaned}${quote}` : "";
      });
    }

    val = removeEmptyQuillParagraphs(stripEditorCaptionArtifacts(normalizeImageWrappersForEdit(val)), whitespaceOptions);
    if (preserveWhitespaceOnlyBlocks) {
      val = normalizeWhitespaceOnlyBlocksForQuill(val);
    }
    return preserveInlineWhitespace
      ? preserveSignificantInlineWhitespaceForQuill(val)
      : val;
  }, [props.value, hasResponsive, isSimpleTextField, preserveInlineWhitespace, preserveWhitespaceOnlyBlocks, shouldNormalizeExcessiveIndent]);

  const handleBlur = useCallback(() => {
    let blurContent = lastRelativeContentRef.current;
    if (commitOnBlurOnly && blurContent != null) {
      const quill = getQuillEditor();
      const html = quill?.root?.innerHTML || localEditorHtmlRef.current || blurContent;
      blurContent = normalizeContentForSave(html);
      lastRelativeContentRef.current = blurContent;
    }

    if (props.onBlur && blurContent != null) {
      props.onBlur(blurContent);
    }

    if (onChangeTimeoutRef.current) {
      clearTimeout(onChangeTimeoutRef.current);
      onChangeTimeoutRef.current = null;
      if (onChangeRef.current && blurContent != null) {
        onChangeRef.current(blurContent);
      }
    }

    isUserEditingRef.current = false;
    localEditorHtmlRef.current = null;
    setSyncTrigger(prev => !prev);
  }, [commitOnBlurOnly, getQuillEditor, normalizeContentForSave, props.onBlur]);

  useEffect(() => {
    let isFocused = false;
    try {
      isFocused = !!getQuillEditor()?.hasFocus?.();
    } catch {
      isFocused = false;
    }

    if (!isFocused && props.value !== lastRelativeContentRef.current) {
      isUserEditingRef.current = false;
      localEditorHtmlRef.current = null;
      lastRelativeContentRef.current = props.value || "";
    }
  }, [getQuillEditor, props.value, syncTrigger]);

  useEffect(() => {
    const quill = getQuillEditor();
    if (!quill?.root) return;

    syncListItemFontSizeFromChildren(quill.root);
  }, [absoluteValue, getQuillEditor]);

  let editorValue = localEditorHtmlRef.current ?? absoluteValue;
  let isFocused = false;
  let currentEditor = null;
  try {
    currentEditor = getQuillEditor();
    isFocused = !!currentEditor?.hasFocus?.();
  } catch {
    currentEditor = null;
  }

  const hasSelectedImage = !!selectedImageRef.current;
  if (currentEditor && (isFocused || hasSelectedImage || isUserEditingRef.current)) {
    try {
      editorValue = localEditorHtmlRef.current || currentEditor.root.innerHTML;
    } catch {
      editorValue = localEditorHtmlRef.current ?? absoluteValue;
    }
  }

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    const syncExternalValue = () => {
      if (cancelled) return;

      const quill = getQuillEditor();
      if (!quill?.root) return;

      const nextValue = absoluteValue || "";
      if (lastSyncedExternalValueRef.current === nextValue) return;

      let hasFocus = false;
      try {
        hasFocus = !!quill.hasFocus?.();
      } catch {
        hasFocus = false;
      }

      if (hasFocus || isUserEditingRef.current || selectedImageRef.current) {
        return;
      }

      const currentHtml = quill.root.innerHTML || "";
      const currentRelative = normalizeContentForSave(currentHtml);
      if (currentHtml === nextValue || currentRelative === (props.value || "")) {
        lastSyncedExternalValueRef.current = nextValue;
        lastRelativeContentRef.current = props.value || "";
        return;
      }

      isSyncingExternalValueRef.current = true;
      try {
        if (preserveWhitespaceOnlyBlocks) {
          quill.root.innerHTML = nextValue;
        } else if (quill.clipboard?.convert && quill.setContents) {
          const delta = quill.clipboard.convert({ html: nextValue });
          quill.setContents(delta, "silent");
        } else if (quill.clipboard?.dangerouslyPasteHTML) {
          quill.clipboard.dangerouslyPasteHTML(0, nextValue, "silent");
        } else {
          quill.root.innerHTML = nextValue;
        }
      } finally {
        lastSyncedExternalValueRef.current = nextValue;
        lastRelativeContentRef.current = props.value || "";
        localEditorHtmlRef.current = null;
        window.requestAnimationFrame(() => {
          isSyncingExternalValueRef.current = false;
        });
      }
    };

    const timers = [0, 50, 150, 350].map((delay) => (
      window.setTimeout(syncExternalValue, delay)
    ));

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [absoluteValue, editorInstanceVersion, getQuillEditor, isReady, normalizeContentForSave, preserveWhitespaceOnlyBlocks, props.value]);

  useEffect(() => {
    if (!isReady) return;

    const timers = [0, 50, 150, 350].map((delay) => window.setTimeout(() => {
      const quill = getQuillEditor();
      if (quill?.root) {
        syncListItemFontSizeFromChildren(quill.root);
      }
    }, delay));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [absoluteValue, editorValue, getQuillEditor, isReady]);

  const {
    formats: quillFormats,
    value: _controlledValue,
    onChange: _controlledOnChange,
    onBlur: _controlledOnBlur,
    ...quillProps
  } = props;

  const getPreviewControlValue = (key, propValue) => (
    commitOnBlurOnly && Object.prototype.hasOwnProperty.call(controlDrafts, key)
        ? normalizeUnsignedControlValue(key, controlDrafts[key])
        : normalizeUnsignedControlValue(key, propValue)
  );
  const globalLineHeight = getPreviewControlValue('lineHeight', lineHeight);
  const globalLineHeightMobile = getPreviewControlValue('lineHeightMobile', lineHeightMobile);
  const globalFontSize = getPreviewControlValue('fontSize', fontSize);
  const globalFontSizeMobile = getPreviewControlValue('fontSizeMobile', fontSizeMobile);
  const globalTranslateY = getPreviewControlValue('translateY', translateY);
  const globalTranslateYMobile = getPreviewControlValue('translateYMobile', translateYMobile);
  const previewFontSizeDesktop = globalFontSize;
  const previewFontSizeMobile = globalFontSizeMobile;
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const activeViewportFontSize = toCssUnit(isMobileViewport ? previewFontSizeMobile || previewFontSizeDesktop : previewFontSizeDesktop || previewFontSizeMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener?.('change', syncViewport);
    mediaQuery.addListener?.(syncViewport);
    return () => {
      mediaQuery.removeEventListener?.('change', syncViewport);
      mediaQuery.removeListener?.(syncViewport);
    };
  }, []);

  const openMobileSelectionControl = useCallback((control) => {
    if (!isMobileAdminViewport() || !canUseMobileSelectionToolbar) return;

    const anchorMap = {
      fontSize: mobileFontSizeButtonRef.current,
      lineHeight: mobileLineHeightButtonRef.current,
      translateY: mobileTranslateButtonRef.current,
    };
    const anchor = anchorMap[control];
    const selection = getCurrentControlSelection(controlSelectionRef.current || lastHighlightSelectionRef.current || savedSelectionRef.current);
    if (!anchor || !selection || selection.length <= 0) return;

    controlSelectionRef.current = { ...selection };
    savedSelectionRef.current = { ...selection };
    lastHighlightSelectionRef.current = { ...selection };
    closeAllToolbarPickers();
    syncSelectionControlsFromFormat(selection);
    setMobileSelectionToolbar((prev) => ({ ...prev, visible: false }));
    clearMobileNativeSelectionOverlay(selection);

    if (control === 'fontSize') {
      controlPopupAnchorRef.current.fontSize = anchor;
      setFontSizePopupPosition(getMobileSelectionPopupPosition(194, 164) || getClampedControlPopupPosition(anchor, 210, 'fontSize', 230));
      setShowSpacingPopup(false);
      setShowTranslatePopup(false);
      setShowFontSizePopup(true);
      return;
    }

    if (control === 'lineHeight') {
      controlPopupAnchorRef.current.lineHeight = anchor;
      setPopupPosition(getMobileSelectionPopupPosition(190, 202) || getClampedControlPopupPosition(anchor, 200, 'lineHeight', 220));
      setShowFontSizePopup(false);
      setShowTranslatePopup(false);
      setShowSpacingPopup(true);
      return;
    }

    if (control === 'translateY') {
      controlPopupAnchorRef.current.translateY = anchor;
      setTranslatePopupPosition(getMobileSelectionPopupPosition(190, 202) || getClampedControlPopupPosition(anchor, 200, 'translateY', 220));
      setShowFontSizePopup(false);
      setShowSpacingPopup(false);
      setShowTranslatePopup(true);
    }
  }, [
    canUseMobileSelectionToolbar,
    clearMobileNativeSelectionOverlay,
    closeAllToolbarPickers,
    getClampedControlPopupPosition,
    getCurrentControlSelection,
    getMobileSelectionPopupPosition,
    syncSelectionControlsFromFormat,
  ]);

  useEffect(() => {
    if (!mobileSelectionToolbar.visible) return;
    if (!isMobileAdminViewport()) return;

    const update = () => updateMobileSelectionToolbarPosition();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    const raf = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [mobileSelectionToolbar.visible, updateMobileSelectionToolbarPosition]);

  useEffect(() => {
    controlPopupOpenRef.current = showFontSizePopup || showSpacingPopup || showTranslatePopup;
    controlPopupVisibleRef.current = {
      fontSize: showFontSizePopup,
      lineHeight: showSpacingPopup,
      translateY: showTranslatePopup,
    };
    const toolbar = containerRef.current?.querySelector('.ql-toolbar');
    toolbar?.classList.toggle('ql-control-popup-open', controlPopupOpenRef.current);
    if (controlPopupOpenRef.current) {
      toolbar?.classList.remove('ql-toolbar-expanded');
    } else {
      controlSelectionRef.current = null;
    }
  }, [showFontSizePopup, showSpacingPopup, showTranslatePopup]);

  useEffect(() => {
    if (showFontSizePopup || showSpacingPopup || showTranslatePopup) return;
    popupInputValuesRef.current = {};
  }, [showFontSizePopup, showSpacingPopup, showTranslatePopup]);

  useEffect(() => {
    if (!showFontSizePopup && !showSpacingPopup && !showTranslatePopup) return;

    const updateOpenPopupPosition = () => {
      const root = containerRef.current;
      if (!root) return;
      if (isMobileAdminViewport() && isControlPopupInputActive()) return;
      const getPopupAnchor = (key, fallbackSelector) => {
        const anchor = controlPopupAnchorRef.current[key];
        if (anchor?.isConnected) return anchor;
        if (anchor && controlButtonRectRef.current[key]) return null;
        return root.querySelector(fallbackSelector);
      };

      if (showFontSizePopup) {
        const button = getPopupAnchor('fontSize', '.ql-font-size-custom');
        const fromMobileToolbar = controlPopupAnchorRef.current.fontSize === mobileFontSizeButtonRef.current;
        setFontSizePopupPosition(
          (fromMobileToolbar ? getMobileSelectionPopupPosition(194, 164) : null)
          || getClampedControlPopupPosition(button, 210, 'fontSize', 230)
        );
      }
      if (showSpacingPopup) {
        const button = getPopupAnchor('lineHeight', '.ql-line-height');
        const fromMobileToolbar = controlPopupAnchorRef.current.lineHeight === mobileLineHeightButtonRef.current;
        setPopupPosition(
          (fromMobileToolbar ? getMobileSelectionPopupPosition(190, 202) : null)
          || getClampedControlPopupPosition(button, 200, 'lineHeight', 220)
        );
      }
      if (showTranslatePopup) {
        const button = getPopupAnchor('translateY', '.ql-translate-y');
        const fromMobileToolbar = controlPopupAnchorRef.current.translateY === mobileTranslateButtonRef.current;
        setTranslatePopupPosition(
          (fromMobileToolbar ? getMobileSelectionPopupPosition(190, 202) : null)
          || getClampedControlPopupPosition(button, 200, 'translateY', 220)
        );
      }
    };

    window.addEventListener('resize', updateOpenPopupPosition);
    if (!isMobileAdminViewport()) {
      window.visualViewport?.addEventListener('resize', updateOpenPopupPosition);
      window.visualViewport?.addEventListener('scroll', updateOpenPopupPosition);
    } else {
      window.visualViewport?.addEventListener('resize', updateOpenPopupPosition);
    }

    const raf = window.requestAnimationFrame(updateOpenPopupPosition);
    const timeoutId = window.setTimeout(updateOpenPopupPosition, 50);
    const keyboardTimeoutId = window.setTimeout(updateOpenPopupPosition, 350);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
      window.clearTimeout(keyboardTimeoutId);
      window.removeEventListener('resize', updateOpenPopupPosition);
      if (!isMobileAdminViewport()) {
        window.visualViewport?.removeEventListener('resize', updateOpenPopupPosition);
        window.visualViewport?.removeEventListener('scroll', updateOpenPopupPosition);
      } else {
        window.visualViewport?.removeEventListener('resize', updateOpenPopupPosition);
      }
    };
  }, [
    getClampedControlPopupPosition,
    getMobileSelectionPopupPosition,
    showFontSizePopup,
    showSpacingPopup,
    showTranslatePopup,
  ]);

  useEffect(() => {
    const buttonStates = [
      ['.ql-font-size-custom', showFontSizePopup],
      ['.ql-line-height', showSpacingPopup],
      ['.ql-translate-y', showTranslatePopup],
    ];

    buttonStates.forEach(([selector, isActive]) => {
      const button = containerRef.current?.querySelector(selector);
      button?.classList.toggle('ql-active', isActive);
    });
  }, [showFontSizePopup, showSpacingPopup, showTranslatePopup]);

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div
      className={`quill-wrapper-container relative ${className} ${disableImageWrap ? "disable-image-wrap" : ""}${isSticky ? " is-sticky" : ""}${isBlogEditor ? " is-blog-editor" : ""}`}
      ref={containerRef}
      style={{
        '--quill-toolbar-top': toolbarTop,
        '--quill-editor-max-height': maxHeight,
        '--quill-editor-min-height': minHeight,
        '--custom-line-height': toLineHeightCssValue(globalLineHeight),
        '--custom-line-height-mobile': toLineHeightCssValue(globalLineHeightMobile),
        '--fs-desktop': toCssUnit(previewFontSizeDesktop),
        '--fs-mobile': toCssUnit(previewFontSizeMobile),
        '--fs': activeViewportFontSize,
        '--translate-y': toCssUnit(globalTranslateY, true),
        '--translate-y-mobile': toCssUnit(globalTranslateYMobile, true),
      }}
    >
      {renderModals()}

      {canUseMobileSelectionToolbar && mobileSelectionToolbar.visible && (hasResponsive || hasLineHeight || hasTranslateY) && (
        <div
          className="ql-mobile-selection-toolbar"
          style={{
            position: 'fixed',
            top: `${safeNumber(mobileSelectionToolbar.top)}px`,
            left: `${safeNumber(mobileSelectionToolbar.left)}px`,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            preserveAdminScrollDuring();
          }}
          onMouseDown={keepPopupInteractionStable}
          onClick={(e) => e.stopPropagation()}
        >
          {hasResponsive && (
            <button
              ref={mobileFontSizeButtonRef}
              type="button"
              aria-label="Font size"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMobileSelectionControl('fontSize');
              }}
              onClick={(e) => e.preventDefault()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M9 4v3h5v12h3V7h5V4H9zm-6 6v3h3v6h3v-6h3v-3H3z" />
              </svg>
            </button>
          )}
          {hasLineHeight && (
            <button
              ref={mobileLineHeightButtonRef}
              type="button"
              aria-label="Line height"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMobileSelectionControl('lineHeight');
              }}
              onClick={(e) => e.preventDefault()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M10 5h12v2H10V5zm0 6h12v2H10v-2zm0 6h12v2H10v-2zM4 4.5l-3 3h2v9H1v3h6v-3H5v-9h2l-3-3z" />
              </svg>
            </button>
          )}
          {hasTranslateY && (
            <button
              ref={mobileTranslateButtonRef}
              type="button"
              aria-label="Text offset"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMobileSelectionControl('translateY');
              }}
              onClick={(e) => e.preventDefault()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M12 2L8 6h3v12H8l4 4 4-4h-3V6h3l-4-4z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {showSpacingPopup && (
        <div
          className="ql-line-height-popup absolute bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[3000]"
          style={{
            position: 'fixed',
            top: safeNumber(popupPosition.top),
            left: safeNumber(popupPosition.left, 12),
            width: `${safeNumber(popupPosition.width, 200)}px`,
            maxWidth: 'calc(100vw - 24px)',
            boxSizing: 'border-box'
          }}
          onMouseDown={keepPopupInteractionStable}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={keepPopupInteractionStable}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>Giãn dòng</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => {
                preserveAdminScrollDuring(() => {
                  commitControlInput(true);
                  setShowSpacingPopup(false);
                });
              }}
            >
              x
            </button>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>Máy tính (px)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Mặc định. VD: 32"
                  value={getPopupInputValue('lineHeight', lineHeight)}
                  onChange={(e) => updateControlDraftValue('lineHeight', e.target.value, false, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitControlInput(true);
                    }
                  }}
                  onBlur={handleControlInputBlur}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => focusControlInput('lineHeight')}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 focus:border-primary focus:outline-none"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>Điện thoại (px)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Mặc định. VD: 24"
                  value={getPopupInputValue('lineHeightMobile', lineHeightMobile)}
                  onChange={(e) => updateControlDraftValue('lineHeightMobile', e.target.value, false, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitControlInput(true);
                    }
                  }}
                  onBlur={handleControlInputBlur}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => focusControlInput('lineHeightMobile')}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 focus:border-primary focus:outline-none"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none"
                onClick={() => {
                  preserveAdminScrollDuring(() => {
                    commitControlInput(true);
                    setShowSpacingPopup(false);
                  });
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {isMounted && responsiveColorPopup.visible && createPortal(
        <>
          <button
            type="button"
            aria-label="Đóng bảng chọn màu"
            className="fixed inset-0 z-[3998] cursor-default bg-transparent"
            onClick={() => setResponsiveColorPopup((prev) => ({ ...prev, visible: false }))}
          />
          <div
            className="fixed z-[3999] w-[240px] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
            style={{ top: responsiveColorPopup.top, left: responsiveColorPopup.left }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                Màu {responsiveColorPopup.device === 'mobile' ? 'Mobile' : 'Desktop'}
              </span>
              <button
                type="button"
                className="px-1 text-sm text-gray-400 hover:text-gray-700"
                onClick={() => setResponsiveColorPopup((prev) => ({ ...prev, visible: false }))}
              >
                ×
              </button>
            </div>
            <ColorPicker
              fullWidth
              format="hex"
              value={responsiveColorPopup.value}
              onChange={(value) => {
                setResponsiveColorPopup((prev) => ({ ...prev, value }));
                responsiveColorPopup.applyColor?.(value);
              }}
            />
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded-md border border-gray-200"
                style={{ backgroundColor: responsiveColorPopup.value }}
              />
              <input
                type="text"
                inputMode="text"
                maxLength={7}
                aria-label="Mã màu HEX"
                value={responsiveColorPopup.value}
                onChange={(event) => {
                  let value = event.target.value.trim();
                  if (value && !value.startsWith('#')) value = `#${value}`;
                  setResponsiveColorPopup((prev) => ({ ...prev, value }));
                  if (/^#[0-9a-f]{6}$/i.test(value)) {
                    responsiveColorPopup.applyColor?.(value);
                  }
                }}
                className="responsive-color-hex-input h-8 min-w-0 flex-1 rounded-md border border-gray-300 px-2 font-mono text-sm font-bold uppercase outline-none focus:border-blue-500"
                style={{ color: '#111827', WebkitTextFillColor: '#111827', opacity: 1, backgroundColor: '#ffffff' }}
                placeholder="#000000"
              />
            </div>
          </div>
        </>,
        document.body
      )}

      {showFontSizePopup && hasResponsive && (
        <div
          className="ql-font-size-popup absolute bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[3000]"
          style={{
            position: 'fixed',
            top: safeNumber(fontSizePopupPosition.top),
            left: safeNumber(fontSizePopupPosition.left, 12),
            width: `${safeNumber(fontSizePopupPosition.width, 210)}px`,
            maxWidth: 'calc(100vw - 24px)',
            boxSizing: 'border-box'
          }}
          onMouseDown={keepPopupInteractionStable}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={keepPopupInteractionStable}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>Cỡ chữ</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => {
                preserveAdminScrollDuring(() => {
                  commitControlInput(true);
                  setShowFontSizePopup(false);
                });
              }}
            >
              x
            </button>
          </div>
          <div className="space-y-4">
            {/* Desktop size control */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                Máy tính
              </span>
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(getPopupInputValue('fontSize', fontSize)) || 16;
                    updateControlValue('fontSize', Math.max(1, current - 1).toString(), onChangeFontSize);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  -
                </button>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getPopupInputValue('fontSize', fontSize)}
                    onBeforeInput={keepPopupInputKeyInInput}
                    onChange={(e) => updateControlDraftValue('fontSize', e.target.value, false, e.currentTarget)}
                    onKeyDown={(e) => {
                      keepPopupInputKeyInInput(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitControlInput(true);
                      }
                    }}
                    onBlur={handleControlInputBlur}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => focusControlInput('fontSize')}
                    className="w-12 h-8 text-center bg-white border border-gray-200 rounded font-semibold text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    style={{ fontSize: '16px' }}
                    placeholder=""
                  />
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(getPopupInputValue('fontSize', fontSize)) || 16;
                    updateControlValue('fontSize', (current + 1).toString(), onChangeFontSize);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  +
                </button>
              </div>
            </div>

            {/* Mobile size control */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                Điện thoại
              </span>
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(getPopupInputValue('fontSizeMobile', fontSizeMobile)) || 13;
                    updateControlValue('fontSizeMobile', Math.max(1, current - 1).toString(), onChangeFontSizeMobile);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  -
                </button>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getPopupInputValue('fontSizeMobile', fontSizeMobile)}
                    onBeforeInput={keepPopupInputKeyInInput}
                    onChange={(e) => updateControlDraftValue('fontSizeMobile', e.target.value, false, e.currentTarget)}
                    onKeyDown={(e) => {
                      keepPopupInputKeyInInput(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitControlInput(true);
                      }
                    }}
                    onBlur={handleControlInputBlur}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => focusControlInput('fontSizeMobile')}
                    className="w-12 h-8 text-center bg-white border border-gray-200 rounded font-semibold text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    style={{ fontSize: '16px' }}
                    placeholder=""
                  />
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(getPopupInputValue('fontSizeMobile', fontSizeMobile)) || 13;
                    updateControlValue('fontSizeMobile', (current + 1).toString(), onChangeFontSizeMobile);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTranslatePopup && (
        <div
          className="ql-translate-y-popup absolute bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[3000]"
          style={{
            position: 'fixed',
            top: safeNumber(translatePopupPosition.top),
            left: safeNumber(translatePopupPosition.left, 12),
            width: `${safeNumber(translatePopupPosition.width, 200)}px`,
            maxWidth: 'calc(100vw - 24px)',
            boxSizing: 'border-box'
          }}
          onMouseDown={keepPopupInteractionStable}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={keepPopupInteractionStable}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>Dịch chữ</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => {
                preserveAdminScrollDuring(() => {
                  commitControlInput(true);
                  setShowTranslatePopup(false);
                });
              }}
            >
              x
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Máy tính (px)</label>
              <input
                type="text"
                placeholder="VD: -20 hoặc 10"
                value={getPopupInputValue('translateY', translateY)}
                onChange={(e) => updateControlDraftValue('translateY', e.target.value, true, e.currentTarget)}
                onKeyDown={(e) => {
                  keepPopupInputKeyInInput(e);
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitControlInput(true);
                  }
                }}
                onBlur={handleControlInputBlur}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => focusControlInput('translateY')}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-primary focus:outline-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Điện thoại (px)</label>
              <input
                type="text"
                placeholder="VD: -10 hoặc 5"
                value={getPopupInputValue('translateYMobile', translateYMobile)}
                onChange={(e) => updateControlDraftValue('translateYMobile', e.target.value, true, e.currentTarget)}
                onKeyDown={(e) => {
                  keepPopupInputKeyInInput(e);
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitControlInput(true);
                  }
                }}
                onBlur={handleControlInputBlur}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => focusControlInput('translateYMobile')}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-primary focus:outline-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none"
                onClick={() => {
                  preserveAdminScrollDuring(() => {
                    commitControlInput(true);
                    setShowTranslatePopup(false);
                  });
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />
      {!modules ? (
        <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading editor...</span>
          </div>
        </div>
      ) : (
        <ReactQuill
          ref={handleEditorRef}
          {...quillProps}
          defaultValue={editorValue || ""}
          onChange={handleOnChange}
          onChangeSelection={handleSelectionChange}
          onBlur={handleBlur}
          modules={customModules}
          formats={quillFormats || FORMATS}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .quill-wrapper-container {
          position: relative;
        }

        ${(dynamicFonts.length > 0 ? dynamicFonts : (cachedFonts || [])).map(f => `
          .quill-wrapper-container [style*="font-family: ${f.slug}"],
          .quill-wrapper-container [style*="font-family:${f.slug}"],
          .quill-wrapper-container [style*="font-family: '${f.slug}'"] {
            font-family: "${f.family}", sans-serif !important;
          }
        `).join('\n')}

        .quill-wrapper-container .ql-container,
        .quill-wrapper-container .ql-editor {
          min-height: var(--quill-editor-min-height, 120px) !important;
          overflow-anchor: none !important;
        }

        .ql-editor .editor-image-caption,
        .ql-editor .editor-inline-image-caption {
          display: none !important;
        }

        .quill-wrapper-container .ql-editor.hero-phone-text {
          padding-top: 28px !important;
          min-height: calc(var(--quill-editor-min-height, 120px) + 28px) !important;
        }

        .quill-wrapper-container[style*="--custom-line-height:"] .ql-editor {
          line-height: var(--custom-line-height) !important;
        }
        @media (min-width: 768px) {
          .quill-wrapper-container[style*="--custom-line-height:"][style*="--fs-desktop"] .ql-editor.hero-phone-text,
          .quill-wrapper-container[style*="--custom-line-height:"][style*="--fs-desktop"] .ql-editor.hero-phone-text * {
            line-height: max(var(--custom-line-height), 1.15em) !important;
          }
        }
        @media (max-width: 767px) {
          .quill-wrapper-container[style*="--custom-line-height-mobile:"] .ql-editor {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .quill-wrapper-container[style*="--custom-line-height-mobile:"][style*="--fs-mobile"] .ql-editor.hero-phone-text,
          .quill-wrapper-container[style*="--custom-line-height-mobile:"][style*="--fs-mobile"] .ql-editor.hero-phone-text * {
            line-height: max(var(--custom-line-height-mobile, var(--custom-line-height)), 1.15em) !important;
          }
        }
        .quill-wrapper-container[style*="--translate-y"] .ql-editor {
          transform: translateY(var(--translate-y)) !important;
        }
        .quill-wrapper-container[style*="--translate-y"] .ql-editor.title-sub-text {
          transform: translate(-50%, var(--translate-y)) !important;
        }
        @media (max-width: 767px) {
          .quill-wrapper-container[style*="--translate-y"] .ql-editor {
            transform: translateY(var(--translate-y-mobile, var(--translate-y))) !important;
          }
          .quill-wrapper-container[style*="--translate-y"] .ql-editor.title-sub-text {
            transform: translate(-50%, var(--translate-y-mobile, var(--translate-y))) !important;
          }
        }

        /* Auto scale editor container to avoid overlap with toolbar when translating */
        .quill-wrapper-container[style*="--translate-y"] .ql-container {
          margin-top: calc(-1 * min(var(--translate-y), 0px)) !important;
          margin-bottom: calc(max(var(--translate-y), 0px)) !important;
          overflow: visible !important;
        }
        .quill-wrapper-container[style*="--translate-y"] .ql-editor {
          overflow: visible !important;
        }
        @media (max-width: 767px) {
          .quill-wrapper-container[style*="--translate-y"] .ql-container {
            margin-top: calc(-1 * min(var(--translate-y-mobile, var(--translate-y)), 0px)) !important;
            margin-bottom: calc(max(var(--translate-y-mobile, var(--translate-y)), 0px)) !important;
          }
        }
        @media (min-width: 768px) {
          .quill-wrapper-container.is-blog-editor[style*="--fs-desktop"] .ql-editor *:not(.image-caption):not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor p:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor span:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor a:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor li:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h1:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h2:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h3:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h4:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h5:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h6:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h1 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h2 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h3 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h4 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor p *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor li *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])) {
            font-size: var(--fs-desktop) !important;
          }
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor *[style*="--fs"],
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor *[style*="--fs"] *,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.title-main-text,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.title-main-text *,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.title-sub-text,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.title-sub-text *,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.hero-phone-text,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.hero-phone-text *,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.hero-slogan-text,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.hero-slogan-text *,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.mobile-watermark-text,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor.mobile-watermark-text * {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .quill-wrapper-container.is-blog-editor[style*="--fs-mobile"] .ql-editor *:not(.image-caption):not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor p:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor span:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor a:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor li:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h1:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h2:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h3:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h4:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h5:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h6:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h1 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h2 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h3 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h4 *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor p *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor li *:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])) {
            font-size: var(--fs-mobile) !important;
          }
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor *[style*="--fs"],
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor *[style*="--fs"] *,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.title-main-text,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.title-main-text *,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.title-sub-text,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.title-sub-text *,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.hero-phone-text,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.hero-phone-text *,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.hero-slogan-text,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.hero-slogan-text *,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.mobile-watermark-text,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor.mobile-watermark-text * {
            font-size: var(--fs-mobile) !important;
          }
        }
        @media (min-width: 768px) {
          .quill-wrapper-container .ql-editor [style*="--fs-desktop"],
          .quill-wrapper-container .ql-editor [style*="--fs-desktop"] *:not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) {
            font-size: var(--fs-desktop) !important;
          }
          .quill-wrapper-container .ql-editor li[style*="--fs-desktop"]::marker {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .quill-wrapper-container .ql-editor [style*="--fs-mobile"],
          .quill-wrapper-container .ql-editor [style*="--fs-mobile"] *:not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) {
            font-size: var(--fs-mobile) !important;
          }
          .quill-wrapper-container .ql-editor li[style*="--fs-mobile"]::marker {
            font-size: var(--fs-mobile) !important;
          }
        }
        .quill-wrapper-container .ql-editor [style*="--custom-line-height:"],
        .quill-wrapper-container .ql-editor [style*="--custom-line-height:"] * {
          line-height: var(--custom-line-height) !important;
        }
        .quill-wrapper-container .ql-editor [style*="--translate-y"] {
          transform: translateY(var(--translate-y)) !important;
        }
        .quill-wrapper-container .ql-editor span[style*="--translate-y"] {
          display: inline-block !important;
        }
        @media (max-width: 767px) {
          .quill-wrapper-container .ql-editor [style*="--color-mobile"] {
            color: var(--color-mobile) !important;
          }
          .quill-wrapper-container .ql-editor [style*="--custom-line-height-mobile:"],
          .quill-wrapper-container .ql-editor [style*="--custom-line-height-mobile:"] * {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .quill-wrapper-container .ql-editor [style*="--translate-y-mobile"] {
            transform: translateY(var(--translate-y-mobile, var(--translate-y, 0px))) !important;
          }
          .quill-wrapper-container .ql-editor span[style*="--translate-y-mobile"] {
            display: inline-block !important;
          }
        }

        .quill-wrapper-container .ql-toolbar button.ql-color-desktop-custom,
        .quill-wrapper-container .ql-toolbar button.ql-color-mobile-custom {
          position: relative;
        }
        .quill-wrapper-container .ql-toolbar button.ql-color-desktop-custom::after,
        .quill-wrapper-container .ql-toolbar button.ql-color-mobile-custom::after {
          position: absolute;
          right: -2px;
          bottom: -3px;
          z-index: 2;
          padding: 0 2px;
          border-radius: 3px;
          background: #fff;
          color: #4b5563;
          font-size: 8px;
          font-weight: 700;
          line-height: 11px;
          pointer-events: none;
        }
        .quill-wrapper-container .ql-toolbar button.ql-color-desktop-custom::after {
          content: "D";
        }
        .quill-wrapper-container .ql-toolbar button.ql-color-mobile-custom::after {
          content: "M";
        }

        .quill-wrapper-container .ql-container .ql-tooltip.ql-hidden,
        .quill-wrapper-container .ql-container .ql-tooltip.ql-hidden * {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
        }

        /* === Fix: title-main-text (H1) với decorative fonts như Dancing Script ===
           Dancing Script có ascenders rất cao + dấu tiếng Việt (â, ă, ê, ô, ơ, ư + sắc/huyền/hỏi/ngã/nặng)
           vượt xa ra ngoài line-height 1.1~1.2. Cần line-height >= 1.8 để:
           - Selection (bôi đen) cover hết chữ kể cả dấu mũ
           - Background-color highlight bao hết phần trên/dưới của chữ
        */
        .quill-wrapper-container .ql-editor.title-main-text {
          overflow: visible !important;
        }
        .quill-wrapper-container .ql-editor.title-main-text h1,
        .quill-wrapper-container .ql-editor.title-main-text h2,
        .quill-wrapper-container .ql-editor.title-main-text p {
          overflow: visible !important;
        }
        .quill-wrapper-container .ql-editor.title-main-text h1 span,
        .quill-wrapper-container .ql-editor.title-main-text h2 span,
        .quill-wrapper-container .ql-editor.title-main-text p span,
        .quill-wrapper-container .ql-editor.title-main-text span {
          line-height: inherit !important;
        }

        .quill-wrapper-container .ql-editor.title-bg-text,
        .quill-wrapper-container .ql-editor.mobile-watermark-text {
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: -0.05em !important;
          text-transform: uppercase !important;
          line-height: 0.85 !important;
          text-align: center !important;
        }
        .quill-wrapper-container .ql-editor.title-bg-text *,
        .quill-wrapper-container .ql-editor.mobile-watermark-text * {
          line-height: inherit !important;
          text-transform: inherit !important;
        }

        /* === Đánh dấu màu nền (highlight) === */
        /* General: all span[background-color] in any editor - wraps text like Word */
        .quill-wrapper-container .ql-editor span[style*="background-color"] {
          display: inline !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
          padding-top: 0.15em !important;
          padding-bottom: 0.15em !important;
          line-height: inherit !important;
        }
        /* For H1/H2/H3: use flex to center text inside highlight box */
        .quill-wrapper-container .ql-editor h1 span[style*="background-color"],
        .quill-wrapper-container .ql-editor h2 span[style*="background-color"],
        .quill-wrapper-container .ql-editor h3 span[style*="background-color"] {
          display: inline-flex !important;
          align-items: center !important;
          vertical-align: middle !important;
          padding: 0.12em 0.05em !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        /* Special decorative editors (title-main-text, title-bg-text, mobile-watermark) */
        .quill-wrapper-container .ql-editor.title-main-text span[style*="background-color"],
        .quill-wrapper-container .ql-editor.title-bg-text span[style*="background-color"],
        .quill-wrapper-container .ql-editor.mobile-watermark-text span[style*="background-color"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1.12 !important;
          padding: 0.08em 0.06em 0.14em !important;
          vertical-align: middle !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        .quill-wrapper-container .ql-editor.title-main-text p[style*="background-color"],
        .quill-wrapper-container .ql-editor.title-bg-text p[style*="background-color"],
        .quill-wrapper-container .ql-editor.mobile-watermark-text p[style*="background-color"] {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1.12 !important;
          padding: 0.08em 0.06em 0.14em !important;
          width: fit-content !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        @media (max-width: 767px) {
          .quill-wrapper-container .ql-editor.title-bg-text *[style*="font-size"],
          .quill-wrapper-container .ql-editor.mobile-watermark-text *[style*="font-size"] {
          }

          /* General paragraph & span fallbacks when no custom inline size is set */
          .quill-wrapper-container:not([style*="--fs-mobile"]) .ql-editor:not(.title-main-text):not(.title-sub-text):not(.mobile-watermark-text):not(.title-bg-text) p:not(h1 p):not(h2 p):not(h3 p):not(.hero-phone-text *):not(.hero-slogan-text *):not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-mobile"]) .ql-editor:not(.title-main-text):not(.title-sub-text):not(.mobile-watermark-text):not(.title-bg-text) span:not(h1 span):not(h2 span):not(h3 span):not(.hero-phone-text *):not(.hero-slogan-text *):not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-mobile"]) .ql-editor:not(.title-main-text):not(.title-sub-text):not(.mobile-watermark-text):not(.title-bg-text) *:not(h1):not(h1 *):not(h2):not(h2 *):not(h3):not(h3 *):not(h4):not(h4 *):not(.hero-phone-text *):not(.hero-slogan-text *):not([style*="--fs"]):not([style*="font-size"]) {
          }

          /* Fallback sizes for Hero Phone and Hero Slogan when no custom inline size is set */
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-phone-text:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-phone-text *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-slogan-text:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-slogan-text *:not([style*="--fs"]):not([style*="font-size"]) {
          }

          /* Standard heading scaling for other rich text editors on mobile */
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h1,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h1 *,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h2,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h2 *,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h3,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h3 *,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h4,
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-bg-text):not(.title-sub-text):not(.mobile-watermark-text):not(.describe-h2-wrapper) h4 * {
            margin-bottom: 5px !important;
            margin-top: 0 !important;
          }

          /* Main Title editor scaling on mobile */
          .quill-wrapper-container .ql-editor.title-main-text .font-cursive,
          .quill-wrapper-container .ql-editor.title-main-text [style*="cursive"],
          .quill-wrapper-container .ql-editor.title-main-text .ql-size-huge,
          .quill-wrapper-container .ql-editor.title-main-text h1 .font-cursive,
          .quill-wrapper-container .ql-editor.title-main-text h2 .font-cursive,
          .quill-wrapper-container .ql-editor.title-main-text h1 span,
          .quill-wrapper-container .ql-editor.title-main-text h2 span,
          .quill-wrapper-container .ql-editor.title-main-text p,
          .quill-wrapper-container .ql-editor.title-main-text p span,
          .quill-wrapper-container .ql-editor.title-main-text p .font-cursive {
            display: block !important;
            margin-top: 5px !important;
            margin-bottom: 5px !important;
          }

          .quill-wrapper-container .ql-editor.title-main-text h1,
          .quill-wrapper-container .ql-editor.title-main-text h2,
          .quill-wrapper-container .ql-editor.title-main-text .ql-size-huge,
          .quill-wrapper-container .ql-editor.title-main-text .font-cursive,
          .quill-wrapper-container .ql-editor.title-main-text span {
            margin-bottom: 0 !important;
            margin-top: 0 !important;
          }

          /* Sub Title editor scaling on mobile */
          .quill-wrapper-container .ql-editor.title-sub-text,
          .quill-wrapper-container .ql-editor.title-sub-text *,
          .quill-wrapper-container .ql-editor.title-sub-text h1,
          .quill-wrapper-container .ql-editor.title-sub-text h1 *,
          .quill-wrapper-container .ql-editor.title-sub-text span,
          .quill-wrapper-container .ql-editor.title-sub-text p {
            letter-spacing: 0.05em !important;
            padding-left: 0.15em !important;
            text-align: center !important;
          }
        }

        .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-size.ql-expanded .ql-picker-options {
          display: flex !important;
          flex-direction: column !important;
        }

        /* Custom Color Picker dropdown overrides */
        .ql-snow .ql-picker-options {
          z-index: 100 !important;
        }
        .ql-snow .ql-color.ql-expanded .ql-picker-options,
        .ql-snow .ql-background.ql-expanded .ql-picker-options,
        .ql-snow .ql-color-picker.ql-expanded .ql-picker-options,
        .ql-snow .ql-background-picker.ql-expanded .ql-picker-options {
          width: 152px !important;
          padding: 8px !important;
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 3px !important;
          z-index: 100 !important;
        }
        .ql-snow .ql-color .ql-picker-options .ql-picker-item,
        .ql-snow .ql-background .ql-picker-options .ql-picker-item,
        .ql-snow .ql-color-picker .ql-picker-options .ql-picker-item,
        .ql-snow .ql-background-picker .ql-picker-options .ql-picker-item {
          width: 16px !important;
          height: 16px !important;
          margin: 0 !important;
          border-radius: 3px !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          float: none !important;
          display: block !important;
        }
        .ql-snow .ql-color .ql-picker-options [data-value="custom-color"],
        .ql-snow .ql-background .ql-picker-options [data-value="custom-color"],
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"],
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"] {
          background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff) !important;
          width: 100% !important;
          height: 24px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          margin-top: 6px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          position: relative !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.2s ease !important;
        }
        .ql-snow .ql-color .ql-picker-options [data-value="custom-color"]:hover,
        .ql-snow .ql-background .ql-picker-options [data-value="custom-color"]:hover,
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"]:hover,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"]:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          border-color: #9ca3af !important;
        }
        .ql-snow .ql-color .ql-picker-options [data-value="custom-color"]::after,
        .ql-snow .ql-background .ql-picker-options [data-value="custom-color"]::after,
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"]::after,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"]::after {
          content: "Custom color" !important;
          font-family: 'Inter', sans-serif !important;
          color: white !important;
          text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.9) !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          pointer-events: none !important;
          white-space: nowrap !important;
        }

        .ql-snow .ql-color .ql-picker-options [data-value="no-color"],
        .ql-snow .ql-background .ql-picker-options [data-value="no-color"],
        .ql-snow .ql-color-picker .ql-picker-options [data-value="no-color"],
        .ql-snow .ql-background-picker .ql-picker-options [data-value="no-color"] {
          background: #ffffff !important;
          width: 100% !important;
          height: 24px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          margin-bottom: 6px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          position: relative !important;
          overflow: hidden !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }

        .ql-snow .ql-color .ql-picker-options [data-value="no-color"]::before,
        .ql-snow .ql-background .ql-picker-options [data-value="no-color"]::before,
        .ql-snow .ql-color-picker .ql-picker-options [data-value="no-color"]::before,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="no-color"]::before {
          content: "" !important;
          position: absolute !important;
          width: 120% !important;
          height: 2px !important;
          background: #ef4444 !important;
          transform: rotate(-12deg) !important;
          opacity: 0.85 !important;
        }

        .ql-snow .ql-color .ql-picker-options [data-value="no-color"]::after,
        .ql-snow .ql-background .ql-picker-options [data-value="no-color"]::after,
        .ql-snow .ql-color-picker .ql-picker-options [data-value="no-color"]::after,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="no-color"]::after {
          content: "Không" !important;
          font-family: 'Inter', sans-serif !important;
          color: #111827 !important;
          background: rgba(255, 255, 255, 0.88) !important;
          padding: 0 6px !important;
          border-radius: 4px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          pointer-events: none !important;
          position: relative !important;
          z-index: 1 !important;
          white-space: nowrap !important;
        }

        .quill-wrapper-container.is-blog-editor .ql-editor {
          font-family: 'Montserrat', sans-serif;
          line-height: 1.6;
          color: #323232;
          padding: 24px 50px !important;
          min-height: inherit;
          max-height: var(--quill-editor-max-height, none) !important;
          overflow-y: auto !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
          background-color: #ffffff !important;
          transition: max-width 0.3s ease, padding 0.3s ease !important;
          width: 100% !important;
          box-sizing: border-box !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor p {
          margin: 0 0 0.5rem 0 !important;
          font-weight: 400;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor h1,
        .quill-wrapper-container.is-blog-editor .ql-editor h2,
        .quill-wrapper-container.is-blog-editor .ql-editor h3,
        .quill-wrapper-container.is-blog-editor .ql-editor h4,
        .quill-wrapper-container.is-blog-editor .ql-editor h5,
        .quill-wrapper-container.is-blog-editor .ql-editor h6 {
          color: #563c39 !important;
          line-height: 1.4 !important;
          margin-top: 0 !important;
          margin-bottom: 1.0rem !important;
          font-weight: 400 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor strong:not([style*="color"]) {
          font-weight: 700 !important;
          color: #563c39 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin: 0 0 1rem 0 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor ol {
          padding-left: 1.5rem !important;
          margin: 0 0 1rem 0 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor li {
          margin: 0.5rem 0 !important;
          line-height: 1.6 !important;
          list-style-position: outside !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor li::before {
          color: currentColor;
          font-size: inherit;
          line-height: inherit !important;
        }
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor {
          min-height: inherit;
          max-height: var(--quill-editor-max-height, none) !important;
          overflow-y: auto !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor p,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor h1,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor h2,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor h3,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor h4,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor h5,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor h6,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor li,
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor span {
          max-width: 100% !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor {
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor p,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor h1,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor h2,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor h3,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor h4,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor h5,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor h6,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor li,
        .product-dialog-quill .quill-wrapper-container.is-blog-editor .ql-editor span {
          max-width: 100% !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .product-dialog-quill--price .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor,
        .product-dialog-quill--equipment .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor {
          line-height: var(--custom-line-height, 1.6) !important;
        }
        @media (max-width: 767px) {
          .product-dialog-quill--price .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor,
          .product-dialog-quill--equipment .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height, 1.6)) !important;
          }
        }
        .product-dialog-quill--price .quill-wrapper-container.is-blog-editor .ql-editor p,
        .product-dialog-quill--equipment .quill-wrapper-container.is-blog-editor .ql-editor p {
          margin: 0 !important;
          line-height: inherit !important;
        }
        .product-dialog-quill--price .quill-wrapper-container.is-blog-editor .ql-editor li,
        .product-dialog-quill--equipment .quill-wrapper-container.is-blog-editor .ql-editor li {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          line-height: inherit !important;
        }
        /* 1:1 responsive content widths matching Details page (W - screen-padding) & main-container padding */
        @media (max-width: 639px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 16px !important;
            max-width: 100% !important;
          }
        }
        @media (min-width: 640px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 50px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
            max-width: 100% !important;
          }
        }
        @media (min-width: 1440px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding-left: 50px !important;
            padding-right: 50px !important;
          }
        }
        /* Preserve selection highlight briefly after toolbar clicks. */
        .ql-editor::selection,
        .ql-editor *::selection {
          background-color: #b3d4fc !important;
          color: inherit !important;
        }
        .ql-editor::-moz-selection,
        .ql-editor *::-moz-selection {
          background-color: #b3d4fc !important;
          color: inherit !important;
        }
        /* Ensure h1/h2 large-font text is also highlighted correctly */
        .ql-editor h1::selection, .ql-editor h1 *::selection,
        .ql-editor h2::selection, .ql-editor h2 *::selection {
          background-color: #b3d4fc !important;
          color: inherit !important;
        }
        .ql-editor h1::-moz-selection, .ql-editor h1 *::-moz-selection,
        .ql-editor h2::-moz-selection, .ql-editor h2 *::-moz-selection {
          background-color: #b3d4fc !important;
          color: inherit !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor p {
          font-family: 'Montserrat', sans-serif;
          line-height: 1.6;
          color: #323232;
          margin: 0 0 0.5rem 0 !important;
          font-weight: 400;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin: 0 0 1rem 0 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin: 0 0 1rem 0 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor li {
          margin: 0.5rem 0 !important;
          line-height: 1.6 !important;
          list-style-position: outside !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor li::before {
          color: currentColor;
          font-size: inherit;
          line-height: inherit !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li {
          display: list-item !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li::before,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li::before {
          content: none !important;
          display: none !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor .ql-ui,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor .ql-ui {
          display: none !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor .ql-whitespace-preserve,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor .ql-whitespace-preserve,
        .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor .ql-whitespace-preserve,
        .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor,
        .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor p,
        .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor span,
        .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor li,
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor [style*="white-space: break-spaces"],
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor [style*="white-space: break-spaces"],
        .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor [style*="white-space: break-spaces"] {
          white-space: break-spaces !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor,
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor *,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor * {
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor ol:has(li[data-list]),
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor ol:has(li[data-list]) {
          list-style-type: decimal !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li[data-list="bullet"],
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li[data-list="bullet"] {
          list-style-type: disc !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li[data-list="ordered"],
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li[data-list="ordered"] {
          list-style-type: decimal !important;
        }
        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li::marker,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor li::marker {
          color: currentColor;
          font-size: 1em;
          line-height: inherit;
        }
        .ql-editor img + .editor-image-caption {
          display: block !important;
          margin-top: 8px !important;
          text-align: center !important;
          width: 100% !important;
          position: static !important;
          color: #666666 !important;
          font-style: italic !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor strong:not([style*="color"]) {
          font-weight: 700 !important;
          color: #563c39 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor strong {
          font-weight: 700 !important;
        }
        .quill-wrapper-container {
          position: relative !important;
          overflow: visible !important;
          container-type: inline-size !important;
          container-name: quill-container !important;
        }
        .quill-wrapper-container:focus-within,
        .quill-wrapper-container:has(.ql-expanded) {
          z-index: 25 !important;
        }
        
        /* Default toolbar options behavior (desktop, width > 900px) */
        .ql-toolbar.ql-snow .ql-formats .ql-more {
          display: none !important;
        }
        .ql-toolbar.ql-snow .ql-more-formats-group {
          display: inline-block !important;
          margin-right: 0 !important;
          vertical-align: middle !important;
        }
        .ql-toolbar.ql-snow .ql-more-dropdown {
          display: contents !important;
        }
        .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats {
          margin-right: 15px !important;
          display: inline-block !important;
          float: none !important;
          vertical-align: middle !important;
        }
        .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats.ql-overflow-hidden {
          display: none !important;
        }
        .ql-toolbar.ql-snow,
        .ql-toolbar.ql-snow .ql-formats,
        .ql-toolbar.ql-snow .ql-more-dropdown {
          white-space: nowrap !important;
        }

        .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-formats .ql-more {
          display: inline-block !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-formats-group {
          position: relative !important;
          overflow: visible !important;
          display: inline-block !important;
          vertical-align: middle !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-dropdown {
          display: none !important;
          position: absolute !important;
          top: calc(100% + 6px) !important;
          right: 0 !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          padding: 10px 14px !important;
          z-index: 9999 !important;
          min-width: 330px !important;
          max-width: 450px !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          justify-content: start !important;
          align-items: center !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing.ql-toolbar-expanded .ql-more-dropdown {
          display: flex !important;
          animation: ql-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-measuring .ql-more-dropdown,
        .ql-toolbar.ql-snow.ql-toolbar-measuring .ql-more-dropdown > .ql-formats {
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .ql-toolbar.ql-snow.ql-control-popup-open .ql-more-dropdown,
        .ql-toolbar.ql-snow.ql-control-popup-open.ql-toolbar-overflowing .ql-more-dropdown,
        .ql-toolbar.ql-snow.ql-control-popup-open.ql-toolbar-overflowing.ql-toolbar-expanded .ql-more-dropdown {
          display: none !important;
        }
        .ql-toolbar.ql-snow.ql-control-popup-open .ql-more-dropdown > .ql-formats {
          display: none !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-dropdown > .ql-formats {
          margin-right: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          border-right: 1px solid #f1f5f9 !important;
          padding-right: 8px !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing:not(.ql-toolbar-expanded) .ql-more-dropdown > .ql-formats.ql-overflow-hidden {
          display: none !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing.ql-toolbar-expanded .ql-more-dropdown > .ql-formats.ql-overflow-hidden {
          display: inline-flex !important;
        }
        .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-dropdown > .ql-formats:last-child {
          border-right: none !important;
          padding-right: 0 !important;
        }

        .ql-toolbar.ql-snow.ql-toolbar-expanded .ql-more {
          color: #1A94FF !important;
        }

        @keyframes ql-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 12px !important;
          background: #f8fafc !important;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          position: relative !important;
          z-index: 10 !important;
          overflow: visible !important;
          white-space: nowrap !important;
        }
        .quill-wrapper-container.is-sticky .ql-toolbar.ql-snow {
          position: sticky !important;
          top: var(--quill-toolbar-top, 0px) !important;
          z-index: 2010 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
        }
        .ql-toolbar.ql-snow:focus-within,
        .ql-toolbar.ql-snow:has(.ql-expanded) {
          z-index: 25 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-container.ql-snow {
          border: none !important;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          background-color: #f8fafc !important; /* Canvas background behind page */
        }
        .quill-wrapper-container:not(.is-blog-editor) .ql-container.ql-snow {
          border: none !important;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          background-color: #ffffff !important;
        }
        .ql-editor img {
          cursor: pointer;
          transition: border-color 0.2s ease;
          border: 4px solid transparent;
          display: inline-block;
          max-width: 100% !important;
          height: auto !important;
          box-sizing: border-box !important;
        }
        .ql-editor img:hover {
          border-color: rgba(26, 148, 255, 0.3);
        }
        .ql-snow .ql-picker.ql-font {
          width: 200px !important;
          max-width: 200px !important;
          flex-shrink: 0 !important;
        }
        .ql-snow .ql-picker.ql-header {
          width: 120px !important;
        }
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"],
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"],
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"],
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"] {
          display: block !important;
        }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before { content: 'Heading 1' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before { content: 'Heading 2' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before { content: 'Heading 3' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before { content: 'Heading 4' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before { content: 'Heading 5' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before { content: 'Heading 6' !important; }

        .ql-snow .ql-picker.ql-font .ql-picker-options {
          width: 300px !important;
          min-width: 300px !important;
          max-height: 250px !important;
          overflow-y: auto !important;
          padding-top: 0 !important;
        }
        .ql-snow .ql-picker.ql-font > .font-search-wrapper {
          display: none !important;
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          width: 300px !important;
          min-width: 300px !important;
          box-sizing: border-box !important;
          padding: 8px !important;
          background: #fff !important;
          border: 1px solid #ccc !important;
          border-bottom: 1px solid #f1f1f1 !important;
          border-radius: 4px 4px 0 0 !important;
          z-index: 21 !important;
        }
        .ql-snow .ql-picker.ql-font.ql-expanded > .font-search-wrapper {
          display: block !important;
        }
        .ql-snow .ql-picker.ql-font.ql-expanded .ql-picker-options {
          top: calc(100% + 51px) !important;
          border-top: 0 !important;
          border-radius: 0 0 4px 4px !important;
        }
        .ql-snow .ql-picker.ql-font .font-search-input {
          display: block !important;
          width: 100% !important;
          height: 34px !important;
          padding: 8px 10px !important;
          border: 1px solid #ddd !important;
          border-radius: 6px !important;
          outline: none !important;
          box-sizing: border-box !important;
          background: #fff !important;
          color: #111827 !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          line-height: 18px !important;
        }
        .ql-snow .ql-picker.ql-font .font-search-input::placeholder {
          color: #747880 !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-item.font-search-hidden {
          display: none !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-item {
          padding: 8px 12px !important;
          display: block !important;
          width: 100% !important;
          min-height: 36px !important;
          box-sizing: border-box !important;
          line-height: 20px !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label {
          overflow: hidden !important;
          padding-right: 20px !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label::before {
          display: block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label:not([data-value])::before {
          content: 'Inter' !important;
          font-family: 'Inter', sans-serif !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="macdinh"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="macdinh"]::before { 
          content: 'Inter' !important;
          font-family: 'Inter', sans-serif !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value]:not([data-value=""]):not([data-value="macdinh"])::before {
          color: #0284c7 !important;
          font-weight: 700 !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value]:not([data-value=""]):not([data-value="macdinh"]) svg {
          stroke: #0284c7 !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label:not([data-value])::before,
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value=""]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="macdinh"]::before {
          color: #4b5563 !important;
          font-weight: 500 !important;
        }
        ${dynamicFonts.filter(font => font.fileUrl).map(font => `
          @font-face {
            font-family: '${escapeCssString(font.family)}';
            src: url('${escapeCssString(font.fileUrl)}') format('${getFontFormat(font.fileType)}');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: '${escapeCssString(font.slug)}';
            src: url('${escapeCssString(font.fileUrl)}') format('${getFontFormat(font.fileType)}');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `).join('\n')}
        ${dynamicFonts.map(font => `
          .quill-wrapper-container .ql-editor .ql-font-${font.slug},
          .quill-wrapper-container .ql-editor .ql-font-${font.slug} *,
          .quill-wrapper-container .ql-editor [style*="font-family: ${font.slug}"],
          .quill-wrapper-container .ql-editor [style*="font-family:${font.slug}"],
          .quill-wrapper-container .ql-editor [style*="font-family: '${font.slug}'"],
          .quill-wrapper-container .ql-editor [style*="font-family:'${font.slug}'"],
          .quill-wrapper-container .ql-editor [style*='font-family: "${font.slug}"'],
          .quill-wrapper-container .ql-editor [style*='font-family:"${font.slug}"'],
          .quill-wrapper-container .ql-editor [style*="${font.slug}"],
          .quill-wrapper-container .ql-editor [style*="${escapeCssString(font.family)}"],
          .quill-wrapper-container .ql-editor [style*="${escapeCssString(font.name)}"] {
            font-family: '${escapeCssString(font.family)}', '${escapeCssString(font.slug)}', sans-serif !important;
          }

          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${font.slug}"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${font.slug}"]::before { 
            content: '${escapeCssString(font.name)}' !important; 
            font-family: '${escapeCssString(font.family)}', '${escapeCssString(font.slug)}', sans-serif !important;
          }
        `).join('\n')}
        .custom-size-dropdown-apply-btn svg {
          width: 14px !important;
          height: 14px !important;
          float: none !important;
          display: block !important;
          margin: 0 !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor h1,
        .quill-wrapper-container.is-blog-editor .ql-editor h2,
        .quill-wrapper-container.is-blog-editor .ql-editor h3,
        .quill-wrapper-container.is-blog-editor .ql-editor h4,
        .quill-wrapper-container.is-blog-editor .ql-editor h5,
        .quill-wrapper-container.is-blog-editor .ql-editor h6 {
          color: #563c39;
          line-height: 1.4;
          margin-top: 0 !important;
          margin-bottom: 1.0rem !important;
          font-weight: 400;
        }
        .ql-editor h1,
        .ql-editor h2,
        .ql-editor h3 {
          clear: both !important;
        }
        .ql-editor .ql-align-center,
        .ql-editor [style*="text-align: center"],
        .ql-editor [style*="text-align:center"],
        .ql-editor p:has([style*="font-family: alex-brush"]),
        .ql-editor p:has([style*="font-family:alex-brush"]),
        .ql-editor p:has([style*="font-family: 'alex-brush'"]),
        .ql-editor p:has([style*="font-family: dancing-script"]),
        .ql-editor p:has([style*="font-family:dancing-script"]),
        .ql-editor p:has([style*="font-family: 'dancing-script'"]),
        .ql-editor p:has([style*="font-family: pinyon-script"]),
        .ql-editor p:has([style*="font-family:pinyon-script"]),
        .ql-editor p:has([style*="font-family: 'pinyon-script'"]),
        .ql-editor p:has([style*="font-family: caveat"]),
        .ql-editor p:has([style*="font-family:caveat"]),
        .ql-editor p:has([style*="font-family: 'caveat'"]),
        .ql-editor p:has([style*="font-family: great-vibes"]),
        .ql-editor p:has([style*="font-family:great-vibes"]),
        .ql-editor p:has([style*="font-family: 'great-vibes'"]),
        .ql-editor p:has([style*="font-family: satisfy"]),
        .ql-editor p:has([style*="font-family:satisfy"]),
        .ql-editor p:has([style*="font-family: 'satisfy'"]),
        .ql-editor p:has([style*="font-family: pacifico"]),
        .ql-editor p:has([style*="font-family:pacifico"]),
        .ql-editor p:has([style*="font-family: 'pacifico'"]),
        .ql-editor p:has([style*="font-family: parisienne"]),
        .ql-editor p:has([style*="font-family:parisienne"]),
        .ql-editor p:has([style*="font-family: 'parisienne'"]),
        .ql-editor p:has([style*="font-family: tangerine"]),
        .ql-editor p:has([style*="font-family:tangerine"]),
        .ql-editor p:has([style*="font-family: 'tangerine'"]) {
          clear: both !important;
        }
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h1,
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h2,
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h3 {
          clear: none !important;
        }

        .quill-wrapper-container.is-blog-editor .ql-editor h1:has(+ p),
        .quill-wrapper-container.is-blog-editor .ql-editor h2:has(+ p),
        .quill-wrapper-container.is-blog-editor .ql-editor h3:has(+ p) {
          margin-bottom: 0.5rem !important;
        }
        .resizer-handle {
          position: absolute;
          width: 36px;
          height: 36px;
          background: white;
          border: 2px solid #1A94FF;
          border-radius: 50%;
          pointer-events: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 2001;
          touch-action: none;
          transition: background 0.15s ease;
        }
        .resizer-handle:hover {
          background: #f0f7ff;
        }
        /* Text Wrapping Toolbar */
        .wrap-toolbar {
          position: absolute;
          top: -44px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          z-index: 2002;
          pointer-events: auto;
        }
        .wrap-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1.5px solid transparent;
          border-radius: 6px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #64748b;
        }
        .wrap-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }
        .wrap-btn.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1d4ed8;
        }
        .wrap-btn.delete-btn {
          color: #ef4444;
        }
        .wrap-btn.delete-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        .wrap-divider {
          width: 1px;
          background: #e2e8f0;
          margin: 4px 2px;
          align-self: stretch;
        }
        .wrap-btn svg {
          width: 18px;
          height: 18px;
        }
        /* Text wrapping styles in editor */
        .ql-editor img[data-wrap="left"] {
          float: left !important;
          margin-right: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 0 !important;
          margin-left: 0 !important;
          display: inline !important;
        }
        .ql-editor img[data-wrap="right"] {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 0 !important;
          margin-right: 0 !important;
          display: inline !important;
        }
        .ql-editor img[data-wrap="none"] {
          float: none !important;
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 20px !important;
        }
        .ql-editor img[data-wrap="left"] + br,
        .ql-editor img[data-wrap="right"] + br {
          clear: both !important;
        }


        @media (min-width: 768px) {
          /* Hide the trailing br inside paragraphs containing floated images to let the paragraph collapse naturally */
          .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) br {
            display: none !important;
          }
          /* Reset margin/padding of the paragraph containing the floated image to allow clean wrapping */
          .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + * {
            margin-top: 0 !important;
          }
        }
        /* Image Caption styling in editor */
        .ql-editor .image-wrapper {
          margin-left: auto !important;
          margin-right: auto !important;
          display: block;
          max-width: 100% !important;
          box-sizing: border-box !important;
          clear: none !important;
        }
        .ql-editor .image-wrapper:not(.image-wrap-left):not(.image-wrap-right) {
          float: none !important;
          display: block !important;
          max-width: 100% !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 12px !important;
          margin-bottom: 10px !important;
        }
        .ql-editor .image-wrap-left {
          float: left !important;
          margin-right: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 0 !important;
          margin-left: 0 !important;
          display: inline-block !important;
          position: relative !important;
        }
        .ql-editor .image-wrap-right {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 0 !important;
          margin-right: 0 !important;
          display: inline-block !important;
          position: relative !important;
        }
        .ql-editor .image-wrapper img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          margin: 0 !important;
        }
        .ql-editor .image-wrap-left img,
        .ql-editor .image-wrap-right img {
          display: block !important;
          float: none !important;
          margin: 0 !important;
          margin-bottom: 0 !important;
        }
        .ql-editor .image-wrapper[data-wrap="none"] {
          float: none !important;
          display: block !important;
          width: auto !important;
          max-width: 100% !important;
          margin-left: auto !important;
          margin-right: auto !important;
          clear: both !important;
        }
        .ql-editor .image-wrapper[data-wrap="none"] img {
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .ql-editor .image-caption {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          color: #666666 !important;
          font-style: italic !important;
          font-size: 16px !important;
          line-height: 1.4 !important;
          pointer-events: none !important;
          box-sizing: border-box !important;
          padding: 0 4px !important;
          margin-top: 8px !important;
          margin-bottom: 4px !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          overflow: visible !important;
        }
        .editor-inline-image-caption {
          display: none !important;
        }
        .editor-inline-image-caption-preview {
          display: none !important;
        }
        .quill-wrapper-container.disable-image-wrap .ql-editor img {
          display: block !important;
          margin-left: 0 !important;
          margin-right: auto !important;
          float: none !important;
        }

        @media (max-width: 767px) {
          /* Hide resizer overlay and wrap toolbar on mobile viewports in admin */
          .editor-image-resizer-overlay {
            display: none !important;
          }
          /* Force editor images to display as full-width block elements on mobile, matching frontend */
          .quill-wrapper-container .ql-editor .image-wrapper {
            float: none !important;
            display: block !important;
            max-width: 100% !important;
            width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 6px !important;
            margin-bottom: 10px !important;
          }
          .quill-wrapper-container .ql-editor img {
            float: none !important;
            display: block !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .ql-editor .image-caption {
            display: block !important;
            font-size: 10px !important;
            line-height: 1.4 !important;
            padding: 0 8px !important;
            margin-top: 8px !important;
            margin-bottom: 6px !important;
          }
          .editor-inline-image-caption {
            display: none !important;
          }

          /* Robust styling reset for Quill Toolbar in admin panel to prevent overrides */
          .quill-wrapper-container .ql-toolbar.ql-snow * {
            font-family: system-ui, -apple-system, sans-serif !important;
            line-height: 1.4 !important;
            display: inline-block !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            float: none !important;
            letter-spacing: normal !important;
            text-transform: none !important;
            font-weight: normal !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow {
            position: relative !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            padding: 6px 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-formats {
            display: inline-flex !important;
            align-items: center !important;
            gap: 2px !important;
            margin-right: 8px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 28px !important;
            height: 24px !important;
            padding: 3px 5px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow button svg {
            width: 16px !important;
            height: 16px !important;
            display: block !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker {
            display: inline-flex !important;
            align-items: center !important;
            height: 24px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker-label {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            height: 100% !important;
            padding: 0 8px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker-label svg {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
          }

          .quill-wrapper-container.is-blog-editor .ql-editor img[data-caption],
          .quill-wrapper-container.is-blog-editor .ql-editor img[title],
          .quill-wrapper-container .ql-editor img[data-caption],
          .quill-wrapper-container .ql-editor img[title] {
            margin-bottom: 0 !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color .ql-picker-label svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background .ql-picker-label svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker .ql-picker-label svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-label svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-align .ql-picker-label svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color .ql-picker-item svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background .ql-picker-item svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker .ql-picker-item svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-item svg,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-align .ql-picker-item svg {
            display: block !important;
            width: 16px !important;
            height: 16px !important;
            opacity: 1 !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color .ql-picker-label,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background .ql-picker-label,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker .ql-picker-label,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-label,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-align .ql-picker-label {
            justify-content: center !important;
            width: 28px !important;
            padding: 0 5px !important;
            cursor: pointer !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker select,
          .quill-wrapper-container .ql-toolbar.ql-snow select.ql-header,
          .quill-wrapper-container .ql-toolbar.ql-snow select.ql-font,
          .quill-wrapper-container .ql-toolbar.ql-snow select.ql-size,
          .quill-wrapper-container .ql-toolbar.ql-snow select.ql-color,
          .quill-wrapper-container .ql-toolbar.ql-snow select.ql-background,
          .quill-wrapper-container .ql-toolbar.ql-snow select.ql-align {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            display: block !important;
            width: 0 !important;
            height: 0 !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
            appearance: none !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker-options {
            display: none !important;
            position: absolute !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            display: flex !important;
            flex-direction: column !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker-options .ql-picker-item {
            display: block !important;
            width: 100% !important;
            padding: 8px 12px !important;
            text-align: left !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color.ql-expanded .ql-picker-options,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background.ql-expanded .ql-picker-options,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker.ql-expanded .ql-picker-options,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker.ql-expanded .ql-picker-options {
            position: fixed !important;
            left: max(12px, calc((100vw - 166px) / 2)) !important;
            top: var(--ql-mobile-palette-top, 50%) !important;
            right: auto !important;
            display: grid !important;
            visibility: visible !important;
            opacity: 1 !important;
            grid-template-columns: repeat(7, 18px) !important;
            width: 166px !important;
            max-width: calc(100vw - 24px) !important;
            padding: 6px !important;
            gap: 4px !important;
            flex-direction: unset !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18) !important;
            overflow: hidden !important;
            z-index: 2147483647 !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color .ql-picker-options .ql-picker-item,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background .ql-picker-options .ql-picker-item,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker .ql-picker-options .ql-picker-item,
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-options .ql-picker-item {
            width: 18px !important;
            height: 18px !important;
            min-height: 18px !important;
            padding: 0 !important;
            border-radius: 4px !important;
            box-sizing: border-box !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color .ql-picker-options [data-value="custom-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background .ql-picker-options [data-value="custom-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color .ql-picker-options [data-value="no-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background .ql-picker-options [data-value="no-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-color-picker .ql-picker-options [data-value="no-color"],
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-options [data-value="no-color"] {
            grid-column: 1 / -1 !important;
            width: 100% !important;
            height: 24px !important;
            min-height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-align.ql-expanded .ql-picker-options {
            position: fixed !important;
            left: max(12px, calc((100vw - 96px) / 2)) !important;
            top: var(--ql-mobile-palette-top, 50%) !important;
            right: auto !important;
            display: grid !important;
            grid-template-columns: repeat(2, 34px) !important;
            width: 96px !important;
            min-width: 76px !important;
            padding: 8px !important;
            gap: 4px !important;
            flex-direction: unset !important;
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18) !important;
            z-index: 2147483647 !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-align .ql-picker-options .ql-picker-item {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 34px !important;
            height: 28px !important;
            min-height: 28px !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-formats-group {
            position: relative !important;
            overflow: visible !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-dropdown {
            display: none !important;
            position: absolute !important;
            top: 28px !important;
            right: 0 !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            padding: 8px 10px !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            z-index: 100 !important;
            width: 300px !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing.ql-toolbar-expanded .ql-more-dropdown {
            display: flex !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-measuring .ql-more-dropdown,
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-measuring .ql-more-dropdown .ql-formats {
            visibility: hidden !important;
            pointer-events: none !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-control-popup-open .ql-more-dropdown,
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-control-popup-open.ql-toolbar-overflowing .ql-more-dropdown,
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-control-popup-open.ql-toolbar-overflowing.ql-toolbar-expanded .ql-more-dropdown {
            display: none !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-control-popup-open .ql-more-dropdown .ql-formats {
            display: none !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-dropdown .ql-formats {
            margin-right: 0 !important;
            border-right: none !important;
            padding-right: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 2px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing:not(.ql-toolbar-expanded) .ql-more-dropdown .ql-formats.ql-overflow-hidden {
            display: none !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing.ql-toolbar-expanded .ql-more-dropdown .ql-formats.ql-overflow-hidden {
            display: inline-flex !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing.ql-toolbar-expanded button.ql-more {
            color: #1A94FF !important;
            background: #e6f7ff !important;
            border-radius: 4px !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow button.ql-font-size-custom.ql-active,
          .quill-wrapper-container .ql-toolbar.ql-snow button.ql-line-height.ql-active,
          .quill-wrapper-container .ql-toolbar.ql-snow button.ql-translate-y.ql-active {
            color: #1A94FF !important;
            background: #e6f7ff !important;
            border-radius: 4px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow {
            position: relative !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            padding: 6px 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-formats-group {
            position: static !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing .ql-more-dropdown {
            left: 10px !important;
            right: 10px !important;
            width: auto !important;
            top: 100% !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-size .ql-picker-options {
            min-width: 180px !important;
            width: 180px !important;
            left: 0 !important;
            right: auto !important;
            overflow-x: hidden !important;
          }
          /* Override wildcard rules for Font Search component on mobile */
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-font {
            width: 90px !important;
            max-width: 90px !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-font .ql-picker-options {
            width: 160px !important;
            min-width: 160px !important;
            left: 0 !important;
            right: auto !important;
            top: calc(100% + 51px) !important;
            border-top: 0 !important;
            border-radius: 0 0 4px 4px !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-font > .font-search-wrapper {
            display: none !important;
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            width: 160px !important;
            min-width: 160px !important;
            box-sizing: border-box !important;
            padding: 8px !important;
            background: #fff !important;
            border: 1px solid #ccc !important;
            border-bottom: 1px solid #f1f1f1 !important;
            border-radius: 4px 4px 0 0 !important;
            z-index: 21 !important;
            height: auto !important;
            margin: 0 !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-font.ql-expanded > .font-search-wrapper {
            display: block !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker.ql-font .font-search-input {
            display: block !important;
            width: 100% !important;
            height: 34px !important;
            padding: 8px 10px !important;
            border: 1px solid #ddd !important;
            border-radius: 6px !important;
            outline: none !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #111827 !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            line-height: 18px !important;
            margin: 0 !important;
          }
          .quill-wrapper-container .ql-editor.title-bg-text,
          .quill-wrapper-container .ql-editor.mobile-watermark-text {
          }
          .quill-wrapper-container .ql-editor.title-bg-text *,
          .quill-wrapper-container .ql-editor.mobile-watermark-text * {
          }
        }

        .quill-wrapper-container .ql-toolbar.ql-snow,
        .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-overflowing,
        .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-narrow {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 6px 8px !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: visible !important;
          white-space: normal !important;
          box-sizing: border-box !important;
        }
        .quill-wrapper-container .ql-toolbar.ql-snow .ql-formats {
          display: inline-flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 4px !important;
          margin-right: 8px !important;
          white-space: nowrap !important;
          float: none !important;
        }
        .quill-wrapper-container .ql-toolbar.ql-snow .ql-more,
        .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-formats-group,
        .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-dropdown {
          display: none !important;
        }
        .quill-wrapper-container .ql-toolbar.ql-snow .ql-formats.ql-overflow-hidden {
          display: inline-flex !important;
        }

        .ql-font-size-popup input::placeholder {
          color: #000000 !important;
          opacity: 1 !important;
        }
        .ql-font-size-popup input {
          color: #000000 !important;
        }

        .quill-wrapper-container input,
        .ql-font-size-popup input,
        .ql-line-height-popup input,
        .ql-translate-y-popup input,
        .custom-size-dropdown-input,
        .ql-custom-size-input,
        #quill-custom-color-picker,
        #quill-custom-background-picker,
        #quill-custom-bg-picker {
          font-size: 16px !important;
          -webkit-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
          touch-action: manipulation !important;
        }

        @media (max-width: 767px) {
          .ql-mobile-selection-toolbar {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 5px !important;
            border: 1px solid rgba(148, 163, 184, 0.35) !important;
            border-radius: 10px !important;
            background: #ffffff !important;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18) !important;
            z-index: 2147483200 !important;
            box-sizing: border-box !important;
            touch-action: manipulation !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          }

          .ql-mobile-selection-toolbar button {
            width: 42px !important;
            height: 32px !important;
            min-width: 42px !important;
            min-height: 32px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 0 !important;
            border-radius: 7px !important;
            background: #f8fafc !important;
            color: #1f2937 !important;
            font-size: 15px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            padding: 0 !important;
            touch-action: manipulation !important;
          }

          .ql-mobile-selection-toolbar button:active {
            background: #e0f2fe !important;
            color: #0284c7 !important;
          }

          .ql-mobile-selection-toolbar button svg {
            width: 18px !important;
            height: 18px !important;
            display: block !important;
            pointer-events: none !important;
          }

          .ql-font-size-popup,
          .ql-line-height-popup,
          .ql-translate-y-popup {
            position: fixed !important;
            right: auto !important;
            bottom: auto !important;
            max-width: calc(100vw - 24px) !important;
            max-height: 220px !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            z-index: 2147483647 !important;
            padding: 10px !important;
            border-radius: 12px !important;
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16) !important;
          }

          .ql-font-size-popup {
            max-height: 180px !important;
          }

          .ql-font-size-popup > .flex:first-child,
          .ql-line-height-popup > .flex:first-child,
          .ql-translate-y-popup > .flex:first-child {
            margin-bottom: 8px !important;
          }

          .ql-font-size-popup .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 10px !important;
          }

          .ql-line-height-popup .space-y-3 > :not([hidden]) ~ :not([hidden]),
          .ql-translate-y-popup .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 8px !important;
          }

          .ql-line-height-popup label,
          .ql-translate-y-popup label {
            margin-bottom: 3px !important;
          }

          .ql-font-size-popup input,
          .ql-line-height-popup input,
          .ql-translate-y-popup input {
            min-height: 34px !important;
            border-radius: 8px !important;
          }

          .ql-font-size-popup input {
            height: 32px !important;
          }

          .ql-line-height-popup input,
          .ql-translate-y-popup input {
            padding-top: 5px !important;
            padding-bottom: 5px !important;
          }

          .ql-font-size-popup button,
          .ql-line-height-popup button,
          .ql-translate-y-popup button {
            touch-action: manipulation !important;
          }
        }

        .quill-wrapper-container,
        .quill-wrapper-container .ql-container,
        .quill-wrapper-container .ql-editor {
          overflow-anchor: none !important;
        }

        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-container,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-container {
          min-height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          overscroll-behavior: contain !important;
        }

        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-toolbar,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-toolbar {
          position: sticky !important;
          top: var(--admin-sticky-toolbar-top, 96px) !important;
          z-index: 35 !important;
          background: #ffffff !important;
          border-bottom: 1px solid #d1d5db !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08) !important;
        }

        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor,
        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          overscroll-behavior: contain !important;
          transform: none !important;
        }

        .room-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor {
          min-height: 160px !important;
        }

        .blog-desc-editor.quill-wrapper-container.is-blog-editor .ql-editor {
          min-height: 180px !important;
        }

        @media (max-width: 767px) {
          .quill-wrapper-container.is-blog-editor[style*="--fs-mobile"] .ql-editor .editor-inline-image-caption,
          .quill-wrapper-container.is-blog-editor[style*="--fs-desktop"] .ql-editor .editor-inline-image-caption,
          .quill-wrapper-container.is-blog-editor .ql-editor .editor-inline-image-caption,
          .quill-wrapper-container .ql-editor .editor-inline-image-caption {
            display: none !important;
          }
        }

        .quill-wrapper-container.is-blog-editor[style*="--fs-desktop"] .ql-editor .image-wrapper .image-caption,
        .quill-wrapper-container.is-blog-editor[style*="--fs-mobile"] .ql-editor .image-wrapper .image-caption,
        .quill-wrapper-container[style*="--fs-desktop"] .ql-editor .image-wrapper .image-caption,
        .quill-wrapper-container[style*="--fs-mobile"] .ql-editor .image-wrapper .image-caption,
        .quill-wrapper-container .ql-editor .image-wrapper .image-caption {
          display: block !important;
          font-size: 16px !important;
          line-height: 1.4 !important;
          font-style: italic !important;
          text-align: center !important;
        }

        @media (max-width: 767px) {
          .quill-wrapper-container.is-blog-editor[style*="--fs-desktop"] .ql-editor .image-wrapper .image-caption,
          .quill-wrapper-container.is-blog-editor[style*="--fs-mobile"] .ql-editor .image-wrapper .image-caption,
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor .image-wrapper .image-caption,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor .image-wrapper .image-caption,
          .quill-wrapper-container .ql-editor .image-wrapper .image-caption {
            display: block !important;
            font-size: 10px !important;
            line-height: 1.4 !important;
          }
        }
      `}} />

      {isMounted && resizerRect && createPortal((
        <div
          ref={resizerOverlayRef}
          className={`fixed editor-image-resizer-overlay ${isModalOpen ? 'hidden' : 'block'}`}
          draggable={false}
          style={{
            border: '2px solid #1A94FF',
            boxShadow: '0 0 10px rgba(26, 148, 255, 0.3)',
            zIndex: isModalOpen ? -1 : 40,
            touchAction: 'none',
            pointerEvents: isModalOpen ? 'none' : 'auto',
            userSelect: 'none',
          }}
          onClick={(e) => {
            if (e.target.classList.contains('resizer-handle')) return;
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            const img = resolveImageElement(selectedImageRef.current);
            if (img) {
              handleContainerDblClick({ target: img });
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="wrap-toolbar" style={{ pointerEvents: 'auto' }} onMouseDown={(e) => e.stopPropagation()}>
            {!disableImageWrap && (
              <>
                <button
                  type="button"
                  className={`wrap-btn${imageWrapMode === 'left' ? ' active' : ''}`}
                  title="Wrap left"
                  onClick={(e) => { e.stopPropagation(); handleImageWrap('left'); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" />
                    <line x1="14" y1="4" x2="21" y2="4" />
                    <line x1="14" y1="8" x2="21" y2="8" />
                    <line x1="3" y1="14" x2="21" y2="14" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`wrap-btn${imageWrapMode === 'none' ? ' active' : ''}`}
                  title="Center - no wrap"
                  onClick={(e) => { e.stopPropagation(); handleImageWrap('none'); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="4" x2="21" y2="4" />
                    <rect x="7" y="8" width="10" height="7" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" />
                    <line x1="3" y1="19" x2="21" y2="19" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`wrap-btn${imageWrapMode === 'right' ? ' active' : ''}`}
                  title="Wrap right"
                  onClick={(e) => { e.stopPropagation(); handleImageWrap('right'); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" />
                    <line x1="3" y1="4" x2="10" y2="4" />
                    <line x1="3" y1="8" x2="10" y2="8" />
                    <line x1="3" y1="14" x2="21" y2="14" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <div className="wrap-divider"></div>
              </>
            )}
            <button
              type="button"
              className="wrap-btn delete-btn"
              title="Delete image"
              onClick={(e) => { e.stopPropagation(); handleDeleteImage(); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>

          {/* Resize Handles */}
          {[
            { dir: 'top-left', cursor: 'nwse-resize', style: { top: -15, left: -15 } },
            { dir: 'top-right', cursor: 'nesw-resize', style: { top: -15, right: -15 } },
            { dir: 'bottom-left', cursor: 'nesw-resize', style: { bottom: -15, left: -15 } },
            { dir: 'bottom-right', cursor: 'nwse-resize', style: { bottom: -15, right: -15 } }
          ].map((handle) => (
            <div
              key={handle.dir}
              data-dir={handle.dir}
              className="resizer-handle"
              draggable={false}
              style={{ ...handle.style, cursor: handle.cursor, pointerEvents: 'auto' }}
              onDragStart={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResizeStart(e.nativeEvent || e, handle.dir);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResizeStart(e.nativeEvent || e, handle.dir);
              }}
            />
          ))}
        </div>
      ), document.body)}
    </div>
  );
});

QuillWrapper.displayName = "QuillWrapper";

const MemoizedQuillWrapper = React.memo(QuillWrapper, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.lineHeight === nextProps.lineHeight &&
    prevProps.lineHeightMobile === nextProps.lineHeightMobile &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.fontSizeMobile === nextProps.fontSizeMobile &&
    prevProps.translateY === nextProps.translateY &&
    prevProps.translateYMobile === nextProps.translateYMobile &&
    prevProps.className === nextProps.className &&
    prevProps.editorClassName === nextProps.editorClassName &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.minHeight === nextProps.minHeight &&
    prevProps.hasResponsiveFontSize === nextProps.hasResponsiveFontSize &&
    prevProps.hasResponsiveColor === nextProps.hasResponsiveColor &&
    prevProps.inlineSelectionControls === nextProps.inlineSelectionControls &&
    prevProps.commitOnBlurOnly === nextProps.commitOnBlurOnly &&
    prevProps.theme === nextProps.theme
  );
});

MemoizedQuillWrapper.displayName = "MemoizedQuillWrapper";
export default MemoizedQuillWrapper;
