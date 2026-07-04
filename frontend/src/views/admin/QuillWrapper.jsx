/* eslint-disable react/prop-types */
/* global process */
import React, { forwardRef, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Modal from "@/components/admin/Modal";
import { Button } from "@material-tailwind/react";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/");

const SIZE_MAP = {
  "8": "8px",
  "9": "9px",
  "10": "10px",
  "11": "11px",
  "12": "12px",
  "14": "14px",
  "16": "16px",
  "18": "18px",
  "20": "20px",
  "24": "24px",
  "30": "30px",
  "36": "36px",
  "48": "48px",
  "60": "60px",
  "72": "72px",
  "96": "96px"
};

let cachedFonts = null;
let fetchPromise = null;
const COLORS = [
  "#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff",
  "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff",
  "#bbbbbb", "#f06666", "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff",
  "#888888", "#a10000", "#b26b00", "#b2b200", "#006100", "#0047b2", "#6b24b2",
  "#444444", "#5c0000", "#663d00", "#666600", "#003700", "#002966", "#3d1466",
  "#f1c40f", "#f39c12", "#e67e22", "#d35400", "#7f8c8d", "#34495e", "#2c3e50",
  "#ffeacb", "#ffd19a", "#ffb347", "#799f85", "#e57f7f", "#563c39", "#323232",
  "custom-color"
];

const createModules = (fontList, hasResponsiveFontSize, showSpacingAndTranslation) => {
  const mediaGroup = ["link", "image"];
  if (showSpacingAndTranslation) {
    mediaGroup.push("line-height", "translate-y");
  }
  return {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: fontList }],
      hasResponsiveFontSize ? ["font-size-custom"] : [{ size: Object.values(SIZE_MAP) }],
      ["bold", "italic", "underline", "strike"],
      [{ color: COLORS }, { background: COLORS }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      mediaGroup,
      ["clean"],
      ["more"],
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
  const ImageBlot = Quill.import("formats/image");
  class CustomImageBlot extends ImageBlot {
    static create(value) {
      const node = super.create(value);
      if (typeof value === "string") {
        node.setAttribute("src", value);
        node.setAttribute("data-wrap", "none");
        node.style.setProperty("float", "none", "important");
        node.style.setProperty("display", "block", "important");
      } else if (value && typeof value === "object") {
        node.setAttribute("src", value.src);
        if (value.alt) node.setAttribute("alt", value.alt);
        if (value.title) node.setAttribute("title", value.title);
        if (value.caption) node.setAttribute("data-caption", value.caption);
        if (value.width) {
          node.setAttribute("width", value.width);
          node.style.width = value.width.includes('%') || value.width.includes('px') ? value.width : `${value.width}px`;
        }
        if (value.borderRadius) {
          node.style.borderRadius = value.borderRadius;
          node.setAttribute("data-border-radius", value.borderRadius);
        }
        const wrapMode = value.wrap || "none";
        node.setAttribute("data-wrap", wrapMode);
        if (wrapMode === "left") {
          node.style.setProperty("float", "left", "important");
          node.style.setProperty("display", "inline", "important");
        } else if (wrapMode === "right") {
          node.style.setProperty("float", "right", "important");
          node.style.setProperty("display", "inline", "important");
        } else {
          node.style.setProperty("float", "none", "important");
          node.style.setProperty("display", "block", "important");
        }
      }
      return node;
    }
    static formats(node) {
      let width = node.getAttribute("width");
      if (!width && node.style.width) {
        width = node.style.width;
      }
      let wrap = node.getAttribute("data-wrap");
      if (!wrap) {
        if (node.style.float === 'left') wrap = 'left';
        else if (node.style.float === 'right') wrap = 'right';
      }
      return {
        width: width,
        alt: node.getAttribute("alt"),
        title: node.getAttribute("title"),
        caption: node.getAttribute("data-caption"),
        borderRadius: node.style.borderRadius || node.getAttribute("data-border-radius"),
        wrap: wrap || 'none'
      };
    }
    format(name, value) {
      if (name === "width") {
        this.domNode.setAttribute("width", value);
        this.domNode.style.width = value;
      } else if (name === "alt") {
        if (value) {
          this.domNode.setAttribute("alt", value);
        } else {
          this.domNode.removeAttribute("alt");
        }
      } else if (name === "title") {
        if (value) {
          this.domNode.setAttribute("title", value);
        } else {
          this.domNode.removeAttribute("title");
        }
      } else if (name === "caption") {
        if (value) {
          this.domNode.setAttribute("data-caption", value);
        } else {
          this.domNode.removeAttribute("data-caption");
        }
      } else if (name === "borderRadius") {
        this.domNode.style.borderRadius = value || "";
        if (value) {
          this.domNode.setAttribute("data-border-radius", value);
        } else {
          this.domNode.removeAttribute("data-border-radius");
        }
      } else if (name === "wrap") {
        const wrapMode = value || "none";
        this.domNode.setAttribute("data-wrap", wrapMode);
        if (wrapMode === "left") {
          this.domNode.style.setProperty("float", "left", "important");
          this.domNode.style.setProperty("display", "inline", "important");
        } else if (wrapMode === "right") {
          this.domNode.style.setProperty("float", "right", "important");
          this.domNode.style.setProperty("display", "inline", "important");
        } else {
          this.domNode.style.setProperty("float", "none", "important");
          this.domNode.style.setProperty("display", "block", "important");
        }
      } else {
        super.format(name, value);
      }
    }
  }
  CustomImageBlot.blotName = "image";
  CustomImageBlot.tagName = "img";
  Quill.register(CustomImageBlot, true);

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
    const lineHeightAttributor = new StyleAttributor("lineHeight", "line-height", {
      scope: Parchment.Scope.INLINE
    });
    const verticalAlignAttributor = new StyleAttributor("translateY", "vertical-align", {
      scope: Parchment.Scope.INLINE
    });
    const fontSizeMobileAttributor = new CssVariableAttributor("fontSizeMobile", "--fs-mobile", {
      scope: Parchment.Scope.INLINE
    });

    Quill.register(altAttributor, true);
    Quill.register(titleAttributor, true);
    Quill.register(captionAttributor, true);
    Quill.register(wrapAttributor, true);
    Quill.register(borderRadiusAttributor, true);
    Quill.register(widthAttributor, true);
    Quill.register(lineHeightAttributor, true);
    Quill.register(verticalAlignAttributor, true);
    Quill.register(fontSizeMobileAttributor, true);
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
  }
}

const FORMATS = [
  "header", "font", "size", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align", "link", "image", "wrap",
  "alt", "title", "caption", "borderRadius", "width", "lineHeight", "translateY",
  "fontSizeMobile"
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
      if (lower.startsWith('--fs-mobile')) return true;
      return !lower.startsWith('--fs');
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

const cleanStyleForSave = (styleContent) => {
  const parts = styleContent.split(';');
  let otherStyles = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    if (part.toLowerCase().startsWith('--fs-mobile')) {
      otherStyles.push(part);
      continue;
    }

    if (/^--fs(?:-[\w-]+)?\s*:/i.test(part)) {
      continue;
    }

    const fontSizeMatch = part.match(new RegExp('^font' + '-size\\s*:\\s*(.+)$', 'i'));
    if (fontSizeMatch) {
      continue;
    }

    otherStyles.push(part);
  }

  return otherStyles.join('; ');
};

const cleanStyleForEdit = (styleContent) => {
  const parts = styleContent.split(';');
  let otherStyles = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    if (part.toLowerCase().startsWith('--fs-mobile')) {
      otherStyles.push(part);
      continue;
    }

    if (/^--fs(?:-[\w-]+)?\s*:/i.test(part)) {
      continue;
    }

    const fontSizeMatch = part.match(new RegExp('^font' + '-size\\s*:\\s*(.+)$', 'i'));
    if (fontSizeMatch) {
      continue;
    }

    otherStyles.push(part);
  }

  return otherStyles.join('; ');
};

const removeEmptyStyledSpans = (html) => {
  if (!html || typeof html !== "string") return html;
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

const removeEmptyStyledSpanElements = (root) => {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("span[style]").forEach((span) => {
    const text = (span.textContent || "").replace(/\u00a0/g, "").trim();
    const hasMedia = span.querySelector("img, video, iframe, svg");
    if (!text && !hasMedia) {
      span.remove();
    }
  });
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
  const canUseInlineSelectionControls = !!inlineSelectionControls;
  const hasOnChangeFontSize = !!onChangeFontSize;
  const hasOnChangeFontSizeMobile = !!onChangeFontSizeMobile;
  const hasResponsive = hasResponsiveFontSize !== undefined
    ? hasResponsiveFontSize
    : (hasOnChangeFontSize && hasOnChangeFontSizeMobile);
  const editorRef = useRef(null);
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
  const [controlDrafts, setControlDrafts] = useState({});
  const [selectionControlDrafts, setSelectionControlDrafts] = useState({});
  const selectionControlDraftsRef = useRef({});
  const [activeControlInputKey, setActiveControlInputKey] = useState(null);
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
  const [captions, setCaptions] = useState([]);
  const savedSelectionRef = useRef(null);
  const controlSelectionRef = useRef(null);
  const typingSelectionRef = useRef(null);
  const lastRelativeContentRef = useRef("");
  const localEditorHtmlRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const suppressControlInputBlurRef = useRef(false);
  const controlPopupOpenRef = useRef(false);
  const handleSignedIntegerChange = useCallback((value, onChange) => {
    if (!onChange) return;
    if (value === "" || value === "-" || /^-?\d+$/.test(value)) {
      onChange(value);
    }
  }, []);
  const handleUnsignedIntegerChange = useCallback((value, onChange) => {
    if (!onChange) return;
    if (value === "" || /^\d+$/.test(value)) {
      onChange(value);
    }
  }, []);
  const normalizeUnsignedControlValue = useCallback((key, value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (key !== 'translateY' && key !== 'translateYMobile' && /^0+(?:\.0+)?(?:px)?$/i.test(text)) {
      return "";
    }
    return text;
  }, []);
  const getControlValue = useCallback((key, value) => (
    Object.prototype.hasOwnProperty.call(selectionControlDrafts, key)
      ? normalizeUnsignedControlValue(key, selectionControlDrafts[key])
      : commitOnBlurOnly && Object.prototype.hasOwnProperty.call(controlDrafts, key)
        ? normalizeUnsignedControlValue(key, controlDrafts[key])
        : normalizeUnsignedControlValue(key, value)
  ), [commitOnBlurOnly, controlDrafts, normalizeUnsignedControlValue, selectionControlDrafts]);
  const focusWithoutScroll = useCallback((target) => {
    if (!target || typeof window === 'undefined') return;

    const root = target.root || getQuillEditor()?.root || target;
    const scrollParents = [window];
    let current = root instanceof HTMLElement ? root.parentElement : null;

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

  const preserveScrollAround = useCallback((root, action) => {
    if (typeof window === 'undefined') {
      action?.();
      return;
    }

    const scrollParents = [window];
    let current = root instanceof HTMLElement ? root.parentElement : null;

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

  const keepPopupInteractionStable = useCallback((event) => {
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    preserveAdminScrollDuring();
  }, [preserveAdminScrollDuring]);

  const focusControlInput = useCallback((key) => {
    activeControlInputKeyRef.current = key;
    setActiveControlInputKey(key);
    preserveAdminScrollDuring();
  }, [preserveAdminScrollDuring]);

  useEffect(() => {
    activeControlInputKeyRef.current = activeControlInputKey;
  }, [activeControlInputKey]);

  const applyInlineControlToSelection = useCallback((key, value, options = {}) => {
    const { updateDraft = true } = options;
    if (!canUseInlineSelectionControls || !['fontSize', 'fontSizeMobile', 'lineHeight', 'lineHeightMobile', 'translateY', 'translateYMobile'].includes(key)) return false;

    const quill = getQuillEditor();
    const selection = controlSelectionRef.current || savedSelectionRef.current || quill?.getSelection?.();
    if (!quill || !selection || selection.length <= 0) return false;

    const normalized = normalizeUnsignedControlValue(key, value);
    let formatName = key;
    let formatValue = normalized;

    if (normalized) {
      if (key === 'fontSize') {
        formatName = 'size';
        formatValue = /^\d+$/.test(String(normalized).trim()) ? `${normalized}px` : normalized;
      } else if (key === 'fontSizeMobile') {
        formatName = 'fontSizeMobile';
        formatValue = /^\d+$/.test(String(normalized).trim()) ? `${normalized}px` : normalized;
      } else if (key === 'lineHeight' || key === 'lineHeightMobile') {
        formatName = 'lineHeight';
        formatValue = /^\d+$/.test(String(normalized).trim()) ? `${normalized}px` : normalized;
      } else if (key === 'translateY' || key === 'translateYMobile') {
        formatName = 'translateY';
        formatValue = /^-?\d+$/.test(String(normalized).trim()) ? `${normalized}px` : normalized;
      }
    }

    preserveAdminScrollDuring(() => {
      setSelectionWithoutScroll(quill, selection.index, selection.length, 'silent');
      quill.formatText(selection.index, selection.length, formatName, formatValue || false, 'user');
      removeEmptyStyledSpanElements(quill.root);
      setSelectionWithoutScroll(quill, selection.index, selection.length, 'silent');
      localEditorHtmlRef.current = quill.root.innerHTML;
      isUserEditingRef.current = true;
    });

    if (updateDraft) {
      selectionControlDraftsRef.current = {
        ...selectionControlDraftsRef.current,
        [key]: normalized,
      };
      setSelectionControlDrafts((prev) => ({ ...prev, [key]: normalized }));
    }
    return true;
  }, [canUseInlineSelectionControls, getQuillEditor, normalizeUnsignedControlValue, preserveAdminScrollDuring, setSelectionWithoutScroll]);

  const syncSelectionControlsFromFormat = useCallback((rangeOverride = null) => {
    if (!canUseInlineSelectionControls) return;
    if (activeControlInputKeyRef.current) return;
    const quill = getQuillEditor();
    if (!quill) return;

    const range = rangeOverride || savedSelectionRef.current || quill.getSelection?.();
    if (!range || range.length <= 0) return;

    try {
      const format = quill.getFormat(range);
      
      // Desktop font size (format 'size')
      const size = Array.isArray(format.size) ? format.size[0] : format.size;
      if (typeof size === 'string' && size.trim()) {
        const cleanSize = size.replace('px', '').trim();
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          fontSize: cleanSize,
        };
        setSelectionControlDrafts((prev) => ({
          ...prev,
          fontSize: cleanSize,
        }));
      } else {
        const nextDrafts = { ...selectionControlDraftsRef.current };
        delete nextDrafts.fontSize;
        selectionControlDraftsRef.current = nextDrafts;
        setSelectionControlDrafts((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, 'fontSize')) return prev;
          const next = { ...prev };
          delete next.fontSize;
          return next;
        });
      }

      // Mobile font size (format 'fontSizeMobile')
      const fontSizeMobile = Array.isArray(format.fontSizeMobile) ? format.fontSizeMobile[0] : format.fontSizeMobile;
      if (typeof fontSizeMobile === 'string' && fontSizeMobile.trim()) {
        const cleanSizeMobile = fontSizeMobile.replace('px', '').trim();
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          fontSizeMobile: cleanSizeMobile,
        };
        setSelectionControlDrafts((prev) => ({
          ...prev,
          fontSizeMobile: cleanSizeMobile,
        }));
      } else {
        const nextDrafts = { ...selectionControlDraftsRef.current };
        delete nextDrafts.fontSizeMobile;
        selectionControlDraftsRef.current = nextDrafts;
        setSelectionControlDrafts((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, 'fontSizeMobile')) return prev;
          const next = { ...prev };
          delete next.fontSizeMobile;
          return next;
        });
      }
    } catch { /* ignore */ }
  }, [canUseInlineSelectionControls, getQuillEditor]);

  const updateControlDraftValue = useCallback((key, value, signed = false, inputElement = null) => {
    const isAllowed = signed
      ? (value === "" || value === "-" || /^-?\d+$/.test(value))
      : (value === "" || /^\d+$/.test(value));
    if (!isAllowed) return;

    const nextValue = normalizeUnsignedControlValue(key, value);
    if (hasResponsive && ['fontSize', 'fontSizeMobile', 'lineHeight', 'lineHeightMobile', 'translateY', 'translateYMobile'].includes(key)) {
      selectionControlDraftsRef.current = {
        ...selectionControlDraftsRef.current,
        [key]: nextValue,
      };
      setSelectionControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      return;
    }

    if (commitOnBlurOnly) {
      setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      onControlDraftChange?.(key, nextValue);
      return;
    }

    const callbacks = {
      lineHeight: onChangeLineHeight,
      lineHeightMobile: onChangeLineHeightMobile,
      fontSize: onChangeFontSize,
      fontSizeMobile: onChangeFontSizeMobile,
      translateY: onChangeTranslateY,
      translateYMobile: onChangeTranslateYMobile,
    };
    callbacks[key]?.(nextValue);
  }, [
    commitOnBlurOnly,
    hasResponsive,
    normalizeUnsignedControlValue,
    onChangeFontSize,
    onChangeFontSizeMobile,
    onChangeLineHeight,
    onChangeLineHeightMobile,
    onChangeTranslateY,
    onChangeTranslateYMobile,
    onControlDraftChange,
  ]);

  const updateControlValue = useCallback((key, value, onChange, signed = false) => {
    const isAllowed = signed
      ? (value === "" || value === "-" || /^-?\d+$/.test(value))
      : (value === "" || /^\d+$/.test(value));
    if (!isAllowed) return;

    const nextValue = normalizeUnsignedControlValue(key, value);
    if (hasResponsive && ['fontSize', 'fontSizeMobile', 'lineHeight', 'lineHeightMobile', 'translateY', 'translateYMobile'].includes(key)) {
      const responsiveCallbacks = {
        lineHeight: onChangeLineHeight,
        lineHeightMobile: onChangeLineHeightMobile,
        fontSize: onChangeFontSize,
        fontSizeMobile: onChangeFontSizeMobile,
        translateY: onChangeTranslateY,
        translateYMobile: onChangeTranslateYMobile,
      };
      if (applyInlineControlToSelection(key, value) && !disableImageWrap) return;

      if (responsiveCallbacks[key]) {
        selectionControlDraftsRef.current = {
          ...selectionControlDraftsRef.current,
          [key]: nextValue,
        };
        setSelectionControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
        responsiveCallbacks[key](nextValue);
        return;
      }
    }

    if (commitOnBlurOnly) {
      setControlDrafts((prev) => ({ ...prev, [key]: nextValue }));
      onControlDraftChange?.(key, nextValue);
      return;
    }

    onChange?.(nextValue);
  }, [
    applyInlineControlToSelection,
    commitOnBlurOnly,
    disableImageWrap,
    hasResponsive,
    normalizeUnsignedControlValue,
    onChangeFontSize,
    onChangeFontSizeMobile,
    onChangeLineHeight,
    onChangeLineHeightMobile,
    onChangeTranslateY,
    onChangeTranslateYMobile,
    onControlDraftChange,
  ]);

  const commitControlDrafts = useCallback(() => {
    const callbacks = {
      lineHeight: onChangeLineHeight,
      lineHeightMobile: onChangeLineHeightMobile,
      fontSize: onChangeFontSize,
      fontSizeMobile: onChangeFontSizeMobile,
      translateY: onChangeTranslateY,
      translateYMobile: onChangeTranslateYMobile,
    };

    Object.entries(selectionControlDraftsRef.current).forEach(([key, value]) => {
      if (applyInlineControlToSelection(key, value, { updateDraft: false }) && !disableImageWrap) {
        return;
      }
      if (callbacks[key]) {
        callbacks[key](normalizeUnsignedControlValue(key, value));
      }
    });
    setSelectionControlDrafts({});
    selectionControlDraftsRef.current = {};
    if (!commitOnBlurOnly) return;

    Object.entries(controlDrafts).forEach(([key, value]) => {
      callbacks[key]?.(normalizeUnsignedControlValue(key, value));
    });
    setControlDrafts({});
  }, [
    commitOnBlurOnly,
    controlDrafts,
    selectionControlDrafts,
    applyInlineControlToSelection,
    disableImageWrap,
    onChangeLineHeight,
    onChangeLineHeightMobile,
    onChangeFontSize,
    onChangeFontSizeMobile,
    onChangeTranslateY,
    onChangeTranslateYMobile,
    normalizeUnsignedControlValue,
  ]);

  const focusPopupInput = useCallback((event, key) => {
    event.stopPropagation();
    suppressControlInputBlurRef.current = false;
    activeControlInputKeyRef.current = key;
    focusControlInput(key);
    event.currentTarget?.focus?.({ preventScroll: true });
  }, [focusControlInput]);

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
    setActiveControlInputKey(null);
  }, [commitControlDrafts]);

  const commitControlInput = useCallback(() => {
    commitControlDrafts();
    setActiveControlInputKey(null);
  }, [commitControlDrafts]);

  const getImageWrapMode = useCallback((mode) => {
    if (mode === 'right') return 'right';
    if (mode === 'center' || mode === 'none' || !mode) return 'none';
    return 'left';
  }, []);

  const applyImageWrapDom = useCallback((img, mode) => {
    const wrapMode = getImageWrapMode(mode);
    img.setAttribute('data-wrap', wrapMode);
    img.style.setProperty('float', wrapMode === 'left' ? 'left' : wrapMode === 'right' ? 'right' : 'none', 'important');
    img.style.setProperty('display', wrapMode === 'none' ? 'block' : 'inline', 'important');
    img.style.setProperty('margin-top', wrapMode === 'none' ? '20px' : '12px', 'important');
    img.style.setProperty('margin-bottom', '16px', 'important');
    img.style.setProperty('margin-left', wrapMode === 'right' ? '20px' : wrapMode === 'none' ? 'auto' : '0', 'important');
    img.style.setProperty('margin-right', wrapMode === 'left' ? '20px' : wrapMode === 'none' ? 'auto' : '0', 'important');
    return wrapMode;
  }, [getImageWrapMode]);

  const rememberSelectedImage = useCallback((img) => {
    const nextImage = img || null;
    const nextSrc = nextImage?.getAttribute('src') || "";
    const nextWrap = nextImage?.getAttribute('data-wrap') || 'none';

    selectedImageRef.current = nextImage;
    selectedImageSrcRef.current = nextSrc;
    setSelectedImage((prev) => (prev === nextImage ? prev : nextImage));
    setImageWrapMode((prev) => (prev === nextWrap ? prev : nextWrap));
  }, []);

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
    const current = selectedImageRef.current;
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
  }, [rememberSelectedImage]);

  const syncCustomFontSizes = useCallback(() => {
    const imgContainer = containerRef.current;
    if (!imgContainer) return;
    const elements = imgContainer.querySelectorAll('.ql-editor [style*="--fs"]');
    elements.forEach(el => {
      el.style.removeProperty('--fs');
    });
  }, []);

  const updateCaptionsList = useCallback(() => {
    const imgContainer = containerRef.current;
    if (!imgContainer) return;
    const imgs = imgContainer.querySelectorAll('.ql-editor img');
    const list = [];
    imgs.forEach((img, idx) => {
      const hasDataCaption = img.hasAttribute('data-caption');
      const captionText = hasDataCaption
        ? (img.getAttribute('data-caption') || '').trim()
        : (img.getAttribute('title') || '').trim();
      if (captionText && captionText !== '') {
        list.push({
          id: idx,
          text: captionText
        });
      }
    });
    setCaptions(prev => {
      if (prev.length !== list.length) return list;
      const isDifferent = prev.some((item, index) => {
        const next = list[index];
        return item.id !== next.id || item.text !== next.text;
      });
      return isDifferent ? list : prev;
    });
  }, []);

  const positionCaptionsDirectly = useCallback(() => {
    const imgContainer = containerRef.current;
    if (!imgContainer) return;
    const imgs = imgContainer.querySelectorAll('.ql-editor img');
    const wrapperRect = imgContainer.getBoundingClientRect();
    const captionElements = imgContainer.querySelectorAll('.editor-image-caption');
    const editor = imgContainer.querySelector('.ql-editor');
    const editorRect = editor ? editor.getBoundingClientRect() : null;

    let captionIdx = 0;
    imgs.forEach((img) => {
      const hasDataCaption = img.hasAttribute('data-caption');
      const captionText = hasDataCaption
        ? (img.getAttribute('data-caption') || '').trim()
        : (img.getAttribute('title') || '').trim();
      if (captionText && captionText !== '') {
        const capEl = captionElements[captionIdx];
        if (capEl) {
          const imgRect = img.getBoundingClientRect();
          const top = imgRect.bottom - wrapperRect.top + 12;
          const left = imgRect.left - wrapperRect.left;
          const width = imgRect.width;

          capEl.style.top = `${top}px`;
          capEl.style.left = `${left}px`;
          capEl.style.width = `${width}px`;

          if (editorRect) {
            const isOutside = (imgRect.bottom < editorRect.top || imgRect.top > editorRect.bottom);
            if (isOutside) {
              capEl.style.display = 'none';
            } else {
              capEl.style.display = 'block';
            }
          }
        }
        captionIdx++;
      }
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
    const img = selectedImageRef.current;
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
  }, [getVisibleImageRect]);

  const syncSelectedImageRect = useCallback(() => {
    let img = selectedImageRef.current;
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
  }, [getVisibleImageRect]);

  useEffect(() => {
    positionCaptionsDirectly();
  }, [captions, positionCaptionsDirectly]);

  const updateSizePickerLabel = useCallback(() => {
    const quill = getQuillEditor();
    if (!quill || !containerRef.current) return;

    let format = {};
    try {
      let selection = quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;
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
    if (disableImageWrap) {
      const fontNode = quill.root.querySelector('[style*="font-family"]');
      const fontFamily = fontNode?.style?.fontFamily;
      if (fontFamily) {
        const cleanFamily = fontFamily.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
        const cleanSlug = cleanFamily.replace(/\s+/g, '-');
        const fontList = dynamicFonts.length > 0 ? dynamicFonts : (cachedFonts || []);
        const matchedFont = fontList.find((item) => {
          const candidates = [
            item.slug,
            item.name,
            item.family,
            slugify(item.name || ''),
            slugify(item.family || '')
          ].filter(Boolean).map((candidate) => String(candidate).toLowerCase());
          return candidates.includes(cleanFamily) || candidates.includes(cleanSlug);
        });
        font = matchedFont ? matchedFont.slug : DEFAULT_FONT_VALUE;
      }
    }
    const container = containerRef.current;
    if (!container) return;

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

    const sizePickers = container.querySelectorAll('.ql-size.ql-picker');
    sizePickers.forEach(picker => {
      const label = picker.querySelector('.ql-picker-label');
      if (!label) return;

      const dropdownInput = picker.querySelector('.custom-size-dropdown-input');

      if (size) {
        const sizeVal = Array.isArray(size) ? size[0] : size;
        if (typeof sizeVal === 'string') {
          const cleanSize = sizeVal.replace('px', '');
          label.setAttribute('data-value', sizeVal);
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

        // Allow scrolling dropdown lists when dragging their scrollbar.
        const isScrollbarClick = e.target.scrollHeight > e.target.clientHeight && e.offsetX > e.target.clientWidth;
        if (isScrollbarClick) return;

        const quillInstance = getQuillEditor();
        if (quillInstance) {
          const sel = quillInstance.getSelection();
          if (sel) {
            savedSelectionRef.current = sel;
          }
        }
        // Prevent editor from losing focus when clicking toolbar.
        e.preventDefault();
      }
    };

    const handleMouseup = (e) => {
      const toolbar = container.querySelector('.ql-toolbar');
      if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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

    const handleScrollOrResize = () => {
      try {
        if (!quill.root.querySelector('img')) return;
        syncSelectedImageRect();
        positionCaptionsDirectly();
        positionResizerDirectly();
      } catch { /* ignore */ }
    };

    const handleContentChange = () => {
      const hasImg = (() => {
        try {
          return !!quill.root.querySelector('img');
        } catch {
          return false;
        }
      })();

      if (hasImg) {
        updateCaptionsList();
      }
      syncCustomFontSizes();
      if (hasImg) {
        setTimeout(() => {
          positionCaptionsDirectly();
          positionResizerDirectly();
        }, 0);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    quill.root.addEventListener('scroll', handleScrollOrResize, true);

    const resizeObserver = new ResizeObserver(handleScrollOrResize);
    resizeObserver.observe(quill.root);

    quill.on('selection-change', updateSizePickerLabel);
    quill.on('text-change', updateSizePickerLabel);
    quill.on('text-change', handleContentChange);

    // Initial trigger
    setTimeout(() => {
      updateCaptionsList();
      updateSizePickerLabel();
      syncCustomFontSizes();
      setTimeout(handleScrollOrResize, 50);
      if (toolbar) {
        try {
          toolbar.update(null);
        } catch { /* ignore */ }
      }
    }, 100);

    return () => {
      container.removeEventListener('mousedown', handleMousedown, true);
      container.removeEventListener('mouseup', handleMouseup, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      quill.root.removeEventListener('scroll', handleScrollOrResize, true);
      resizeObserver.disconnect();
      quill.off('selection-change', updateSizePickerLabel);
      quill.off('text-change', updateSizePickerLabel);
      quill.off('text-change', handleContentChange);
    };
  }, [
    isReady,
    updateCaptionsList,
    positionCaptionsDirectly,
    positionResizerDirectly,
    syncSelectedImageRect,
    updateSizePickerLabel,
    preserveAdminScrollDuring,
    setSelectionWithoutScroll,
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
            input.focus?.();
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
                keepSearchInteraction(event);
              }, true);
            });
          }
          ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach((eventName) => {
            input[`on${eventName}`] = (event) => keepSearchInteraction(event);
          });
          input.onclick = (e) => {
            keepSearchInteraction(e);
          };
          input.onmousedown = (e) => {
            keepSearchInteraction(e);
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

    const initDropdown = () => {
      const container = containerRef.current;
      if (!container) return;

      const toolbar = container.querySelector('.ql-toolbar');
      if (!toolbar) return;

      const formats = Array.from(toolbar.children).filter(el => el.classList.contains('ql-formats'));
      const moreGroup = formats.find(f => f.querySelector('.ql-more'));
      if (!moreGroup) return;

      if (toolbar.__toolbarDropdownReady) return;

      moreGroup.classList.add('ql-more-formats-group');

      let dropdown = moreGroup.querySelector('.ql-more-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'ql-more-dropdown';
        moreGroup.appendChild(dropdown);

        // Move target formatting groups (Color, List, Align, Link/Image, Clean) into dropdown
        formats.forEach((f) => {
          if (f === moreGroup) return; // Skip the moreGroup itself

          const hasColor = f.querySelector('.ql-color') || f.querySelector('.ql-background');
          const hasInlineStyle = f.querySelector('.ql-bold') || f.querySelector('.ql-italic') || f.querySelector('.ql-underline') || f.querySelector('.ql-strike');
          const hasList = f.querySelector('.ql-list');
          const hasAlign = f.querySelector('.ql-align');
          const hasLinkImage = f.querySelector('.ql-link') || f.querySelector('.ql-image');
          const hasClean = f.querySelector('.ql-clean');

          if (hasInlineStyle || hasColor || hasList || hasAlign || hasLinkImage || hasClean) {
            dropdown.appendChild(f);
          }
        });
      }

      const updateToolbarOverflow = () => {
        if (controlPopupOpenRef.current || toolbar.querySelector('input:focus')) return;
        if (toolbar.classList.contains('ql-toolbar-expanded')) return;
        if (toolbar.__overflowUpdateQueued) return;

        toolbar.__overflowUpdateQueued = true;
        requestAnimationFrame(() => {
          toolbar.__overflowUpdateQueued = false;
          if (controlPopupOpenRef.current || toolbar.querySelector('input:focus')) return;
          if (!toolbar.isConnected || toolbar.classList.contains('ql-toolbar-expanded')) return;

          const dropdownGroups = Array.from(dropdown.querySelectorAll(':scope > .ql-formats'));
          const previousHidden = dropdownGroups.map((group) => group.classList.contains('ql-overflow-hidden'));
          if (toolbar.classList.contains('ql-toolbar-overflowing')) {
            toolbar.classList.remove('ql-toolbar-overflowing');
          }
          dropdownGroups.forEach((group) => {
            if (group.classList.contains('ql-overflow-hidden')) {
              group.classList.remove('ql-overflow-hidden');
            }
          });

          const moreButtonWidth = moreGroup.querySelector('.ql-more')?.getBoundingClientRect().width || 28;
          const overflowBuffer = moreButtonWidth + 12;
          const isPastToolbar = () => {
            const toolbarRect = toolbar.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const toolbarRight = Math.min(toolbarRect.right, containerRect.right) - overflowBuffer;
            const visibleGroups = Array.from(toolbar.querySelectorAll(':scope > .ql-formats, .ql-more-dropdown > .ql-formats:not(.ql-overflow-hidden)'));
            return visibleGroups.some((group) => group.getBoundingClientRect().right > toolbarRight);
          };

          const nextHidden = dropdownGroups.map(() => false);
          for (let index = dropdownGroups.length - 1; index >= 0 && isPastToolbar(); index -= 1) {
            nextHidden[index] = true;
            dropdownGroups[index].classList.add('ql-overflow-hidden');
          }

          const isOverflowing = nextHidden.some(Boolean);
          const hiddenChanged = nextHidden.some((isHidden, index) => isHidden !== previousHidden[index]);

          if (hiddenChanged) {
            dropdownGroups.forEach((group, index) => {
              group.classList.toggle('ql-overflow-hidden', nextHidden[index]);
            });
          }

          if (toolbar.classList.contains('ql-toolbar-overflowing') !== isOverflowing) {
            toolbar.classList.toggle('ql-toolbar-overflowing', isOverflowing);
          }

          if (!isOverflowing && toolbar.classList.contains('ql-toolbar-expanded')) {
            toolbar.classList.remove('ql-toolbar-expanded');
          }
        });
      };

      updateToolbarOverflow();

      if (!toolbar.__overflowObserver) {
        const overflowObserver = new ResizeObserver(updateToolbarOverflow);
        overflowObserver.observe(container);
        toolbar.__overflowObserver = overflowObserver;
      }
      toolbar.__toolbarDropdownReady = true;
    };

    initDropdown();
    const interval = setInterval(initDropdown, 1000);

    const handleClickOutside = (event) => {
      const toolbar = containerRef.current?.querySelector('.ql-toolbar');
      if (toolbar && toolbar.classList.contains('ql-toolbar-expanded')) {
        if (!toolbar.contains(event.target)) {
          toolbar.classList.remove('ql-toolbar-expanded');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const toolbar = containerRef.current.querySelector('.ql-toolbar');
    if (!toolbar || toolbar.__mobilePickerToggleBound) return;
    toolbar.__mobilePickerToggleBound = true;

    const isOverflowPicker = (picker) => (
      picker?.classList?.contains('ql-picker') &&
      (
        picker.classList.contains('ql-color') ||
        picker.classList.contains('ql-background') ||
        picker.classList.contains('ql-color-picker') ||
        picker.classList.contains('ql-background-picker') ||
        picker.classList.contains('ql-align')
      )
    );
    const closeSiblingPickers = (activePicker) => {
      toolbar.querySelectorAll('.ql-picker').forEach((picker) => {
        if (!isOverflowPicker(picker)) return;
        if (picker !== activePicker) picker.classList.remove('ql-expanded');
      });
    };

    const handlePickerLabelPointer = (event) => {
      const label = event.target.closest?.('.ql-picker-label');
      if (!label || !toolbar.contains(label)) return;

      const picker = label.closest('.ql-picker');
      if (!isOverflowPicker(picker)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const shouldOpen = !picker.classList.contains('ql-expanded');
      closeSiblingPickers(picker);
      picker.classList.toggle('ql-expanded', shouldOpen);
      toolbar.classList.add('ql-toolbar-expanded');
      if (shouldOpen && (
        picker.classList.contains('ql-color') ||
        picker.classList.contains('ql-background') ||
        picker.classList.contains('ql-color-picker') ||
        picker.classList.contains('ql-background-picker')
      )) {
        const labelRect = label.getBoundingClientRect();
        const paletteHeight = 210;
        const top = Math.max(12, Math.min(labelRect.bottom + 8, window.innerHeight - paletteHeight - 12));
        picker.style.setProperty('--ql-mobile-palette-top', `${top}px`);
        const options = picker.querySelector('.ql-picker-options');
        options?.style.setProperty('width', '166px', 'important');
        options?.style.setProperty('max-width', 'calc(100vw - 24px)', 'important');
      }
    };

    const handlePickerItemClick = (event) => {
      const item = event.target.closest?.('.ql-picker-item');
      if (!item || !toolbar.contains(item)) return;

      const ownerPicker = item.closest('.ql-picker');
      if (!isOverflowPicker(ownerPicker)) return;

      window.setTimeout(() => {
        const picker = item.closest('.ql-picker');
        picker?.classList.remove('ql-expanded');
      }, 0);
    };

    toolbar.addEventListener('pointerdown', handlePickerLabelPointer, true);
    toolbar.addEventListener('mousedown', handlePickerLabelPointer, true);
    toolbar.addEventListener('click', handlePickerItemClick, true);

    return () => {
      toolbar.removeEventListener('pointerdown', handlePickerLabelPointer, true);
      toolbar.removeEventListener('mousedown', handlePickerLabelPointer, true);
      toolbar.removeEventListener('click', handlePickerItemClick, true);
      toolbar.__mobilePickerToggleBound = false;
    };
  }, [isReady]);

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
                    const rawVal = originalValue.call(this, domNode);
                    if (!rawVal) return rawVal;

                    const cleanVal = rawVal.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
                    const cleanSlug = cleanVal.replace(/\s+/g, '-');

                    if (cleanVal === 'inter' || cleanVal === 'macdinh') {
                      return 'macdinh';
                    }

                    const listToSearch = sorted || cachedFonts || [];
                    const matched = listToSearch.find(f =>
                      f.slug.toLowerCase() === cleanVal ||
                      f.slug.toLowerCase() === cleanSlug ||
                      slugify(f.name) === cleanVal ||
                      slugify(f.name) === cleanSlug ||
                      slugify(f.family) === cleanVal ||
                      slugify(f.family) === cleanSlug
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

                  Quill.register(FontStyle, true);
                }
              }
              cachedFonts = sorted;
              return sorted;
            } catch (e) {
              console.error(e);
            }
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
      setModules(createModules(toolbarFontValues, hasResponsive, showSpacingAndTranslation));
      setIsReady(true);
    }
  }, [dynamicFonts, hasResponsive, hasLineHeight, hasTranslateY]);

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
    if (!qlEditor) return;
    if (qlEditor) {
      syncEditorState(qlEditor);
    }

    const quill = getQuillEditor();
    let handlePaste = null;

    if (isSimpleTextField && quill) {
      handlePaste = (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        const range = quill.getSelection();
        if (range) {
          quill.insertText(range.index, text);
          setSelectionWithoutScroll(quill, range.index + text.length);
        } else {
          quill.setText(text);
        }
      };
      quill.root.addEventListener('paste', handlePaste);
    }

    return () => {
      if (handlePaste && quill) {
        try {
          quill.root.removeEventListener('paste', handlePaste);
        } catch { /* ignore */ }
      }
    };
  }, [getQuillEditor, isReady, editorClassName, isSimpleTextField, setSelectionWithoutScroll]);

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
                  const sizeVal = Array.isArray(size) ? size[0] : size;
                  if (typeof sizeVal === 'string') {
                    const cleanSize = sizeVal.replace('px', '');
                    observer.disconnect();
                    label.setAttribute('data-value', sizeVal);
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
          input.style.fontSize = '12px';
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
                  setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                } else {
                  quill.format('size', val, 'user');
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
              <input type="text" placeholder="Size..." class="custom-size-dropdown-input" style="flex: 1; min-width: 0; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; height: 26px; line-height: 26px; color: #333; background: #fff;" />
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
                  setSelectionWithoutScroll(quillInstance, savedSel.index, savedSel.length, 'silent');
                } else {
                  quillInstance.format('size', val, 'user');
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
      updateCaptionsList();
      let frameId = 0;

      const schedulePosition = () => {
        if (frameId) return;
        frameId = window.requestAnimationFrame(() => {
          frameId = 0;
          syncSelectedImageRect();
          positionResizerDirectly();
          positionCaptionsDirectly();
        });
      };

      window.addEventListener('resize', schedulePosition);
      window.addEventListener('scroll', schedulePosition, true);
      const editor = containerRef.current?.querySelector('.ql-editor');
      editor?.addEventListener('scroll', schedulePosition, true);
      return () => {
        if (frameId) window.cancelAnimationFrame(frameId);
        window.removeEventListener('resize', schedulePosition);
        window.removeEventListener('scroll', schedulePosition, true);
        editor?.removeEventListener('scroll', schedulePosition, true);
      };
    } else {
      setResizerRect((prev) => (prev === null ? prev : null));
    }
  }, [selectedImage, syncSelectedImageRect, updateCaptionsList, positionResizerDirectly, positionCaptionsDirectly]);

  const handleContainerClick = useCallback((ev) => {
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
      setTimeout(() => {
        updateCaptionsList();
        positionCaptionsDirectly();
      }, 50);
    }
  }, [enterImageEditMode, getQuillEditor, rememberSelectedImage, updateCaptionsList, positionCaptionsDirectly]);

  const handleContainerDblClick = useCallback((ev) => {
    if (disableImageWrap) return; // Do not open image info pop-up on double click for rooms!
    const img = ev.target.closest && ev.target.closest('img');
    const quill = getQuillEditor();
    if (!quill || !img || !quill.root.contains(img)) return;
    openAltModal(
      {
        alt: img.getAttribute('alt') || '',
        title: img.getAttribute('title') || '',
        caption: img.hasAttribute('data-caption') ? (img.getAttribute('data-caption') || '') : (img.getAttribute('title') || ''),
        borderRadius: img.style.borderRadius || img.getAttribute("data-border-radius") || ""
      },
      (newData) => {
        const blot = Quill.find(img);
        if (blot) {
          const index = quill.getIndex(blot);
          quill.formatText(index, 1, 'alt', newData.alt, 'user');
          quill.formatText(index, 1, 'title', newData.title, 'user');
          quill.formatText(index, 1, 'caption', newData.caption, 'user');
          quill.formatText(index, 1, 'borderRadius', newData.borderRadius || '', 'user');
          quill.update('user');
          setTimeout(() => {
            updateCaptionsList();
            positionCaptionsDirectly();
          }, 50);
        }
      }
    );
  }, [disableImageWrap, openAltModal, updateCaptionsList, positionCaptionsDirectly]);

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

  const fileInputRef = useRef(null);

  const handleOnChange = useCallback((content, delta, source, editor) => {
    if (props.onChange) {
      if (source !== 'user') return;
      isUserEditingRef.current = true;
      localEditorHtmlRef.current = content;

      const escapedUrlApi = URL_API.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`src=["']${escapedUrlApi}(assets/[^"']+)["']`, 'gi');
      let relativeContent = removeEmptyStyledSpans(content).replace(regex, 'src="/$1"');
      relativeContent = relativeContent.replace(/src=["']https?:\/\/[^/]+\/(assets\/[^"']+)["']/gi, 'src="/$1"');

      const shouldStripInlineFontSize = hasResponsive || isSimpleTextField;
      if (shouldStripInlineFontSize) {
        relativeContent = relativeContent.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
          const cleaned = stripFontSizeFromStyle(styleContent);
          return cleaned ? `style=${quote}${cleaned}${quote}` : "";
        });
        relativeContent = removeEmptyStyledSpans(relativeContent);
      } else {
        // Clean up custom responsive scaling variables/properties from HTML before saving to database
        relativeContent = relativeContent.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
          const cleaned = cleanStyleForSave(styleContent);
          return cleaned ? `style=${quote}${cleaned}${quote}` : "";
        });
      }

      if (typeof props.value === "string" && relativeContent === props.value) {
        return;
      }

      lastRelativeContentRef.current = relativeContent;
      if (commitOnBlurOnly) {
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
        onDraftChange?.(relativeContent);
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

      props.onChange(relativeContent, delta, source, editor);
    }
  }, [props.onChange, props.value, hasResponsive, isSimpleTextField, commitOnBlurOnly, onDraftChange, getQuillEditor, setSelectionWithoutScroll]);

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

    const handleSelectionChange = (range) => {
      if (range) {
        typingSelectionRef.current = range;
        savedSelectionRef.current = range;
        if (showFontSizePopup) {
          syncSelectionControlsFromFormat(range);
        }
      }
    };

    const preserveEditorInteractionScroll = () => {
      preserveAdminScrollDuring();
    };

    quill.root.addEventListener('beforeinput', rememberTypingSelection, true);
    quill.root.addEventListener('keydown', rememberTypingSelection, true);
    quill.root.addEventListener('mousedown', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('mouseup', rememberTypingSelection, true);
    quill.root.addEventListener('mouseup', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('click', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('focus', preserveEditorInteractionScroll, true);
    quill.root.addEventListener('keyup', rememberTypingSelection, true);
    quill.on('selection-change', handleSelectionChange);

    return () => {
      quill.root.removeEventListener('beforeinput', rememberTypingSelection, true);
      quill.root.removeEventListener('keydown', rememberTypingSelection, true);
      quill.root.removeEventListener('mousedown', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('mouseup', rememberTypingSelection, true);
      quill.root.removeEventListener('mouseup', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('click', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('focus', preserveEditorInteractionScroll, true);
      quill.root.removeEventListener('keyup', rememberTypingSelection, true);
      quill.off('selection-change', handleSelectionChange);
    };
  }, [commitOnBlurOnly, getQuillEditor, isReady, preserveAdminScrollDuring, showFontSizePopup, syncSelectionControlsFromFormat]);

  const syncImageEditChange = useCallback((quill) => {
    if (!quill) return;
    try {
      quill.setSelection(null, 'silent');
      quill.blur();
    } catch { /* ignore */ }

    handleOnChange(quill.root.innerHTML, quill.getContents(), 'user', quill);
  }, [handleOnChange]);

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
    mods.toolbar = {
      container: newToolbar,
      handlers: {
        font: function (value) {
          const quill = this.quill;
          const nextValue = value && value !== 'macdinh' ? value : false;
          const range = quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;

          if (!disableImageWrap) {
            if (range) {
              try {
                focusWithoutScroll(quill);
                setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                savedSelectionRef.current = range;
              } catch { /* ignore */ }
            }
            quill.format('font', nextValue, 'user');
            window.setTimeout(updateSizePickerLabel, 0);
            return;
          }

          if (range?.length > 0) {
            try {
              focusWithoutScroll(quill);
              setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
              savedSelectionRef.current = range;
            } catch { /* ignore */ }
            quill.formatText(range.index, range.length, 'font', nextValue, 'user');
          } else if (disableImageWrap && quill.getLength?.() > 1) {
            quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'font', nextValue, 'user');
          } else {
            if (range) {
              try {
                focusWithoutScroll(quill);
                setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                savedSelectionRef.current = range;
              } catch { /* ignore */ }
            }
            quill.format('font', nextValue, 'user');
          }

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
              handleOnChange(quill.root.innerHTML, quill.getContents(), 'user', quill);
              updateSizePickerLabel();
              syncFontPickerDisplay();
              window.setTimeout(syncFontPickerDisplay, 80);
            } catch { /* ignore */ }
          }, 0);
        },
        'font-size-custom': function () {
          const button = containerRef.current?.querySelector('.ql-font-size-custom');
          if (button && containerRef.current) {
            commitControlDrafts();
            const currentSelection = this.quill?.getSelection?.() || savedSelectionRef.current;
            controlSelectionRef.current = currentSelection?.length > 0 ? { ...currentSelection } : null;
            syncSelectionControlsFromFormat();
            const rect = button.getBoundingClientRect();
            const parentRect = containerRef.current.getBoundingClientRect();
            setFontSizePopupPosition({
              top: safeNumber(rect.bottom - parentRect.top + safeNumber(containerRef.current.scrollTop)),
              left: safeNumber(rect.left - parentRect.left, 10)
            });
            setShowFontSizePopup(prev => !prev);
          }
        },
        'line-height': function () {
          const button = containerRef.current?.querySelector('.ql-line-height');
          if (button && containerRef.current) {
            const currentSelection = this.quill?.getSelection?.() || savedSelectionRef.current;
            controlSelectionRef.current = currentSelection?.length > 0 ? { ...currentSelection } : null;
            const rect = button.getBoundingClientRect();
            const parentRect = containerRef.current.getBoundingClientRect();
            setPopupPosition({
              top: safeNumber(rect.bottom - parentRect.top + safeNumber(containerRef.current.scrollTop)),
              left: safeNumber(rect.left - parentRect.left, 10)
            });
            setShowSpacingPopup(prev => !prev);
          }
        },
        'translate-y': function () {
          const button = containerRef.current?.querySelector('.ql-translate-y');
          if (button && containerRef.current) {
            const currentSelection = this.quill?.getSelection?.() || savedSelectionRef.current;
            controlSelectionRef.current = currentSelection?.length > 0 ? { ...currentSelection } : null;
            const rect = button.getBoundingClientRect();
            const parentRect = containerRef.current.getBoundingClientRect();
            setTranslatePopupPosition({
              top: safeNumber(rect.bottom - parentRect.top + safeNumber(containerRef.current.scrollTop)),
              left: safeNumber(rect.left - parentRect.left, 10)
            });
            setShowTranslatePopup(prev => !prev);
          }
        },
        more: function () {
          const toolbarEl = this.container || this.quill.root.parentNode.querySelector('.ql-toolbar');
          if (toolbarEl) {
            if (controlPopupOpenRef.current) {
              toolbarEl.classList.remove('ql-toolbar-expanded');
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
          const currentImg = selectedImageRef.current;

          if (currentImg) {
            const currentData = {
              alt: currentImg.getAttribute("alt") || "",
              title: currentImg.getAttribute("title") || "",
              caption: currentImg.hasAttribute('data-caption') ? (currentImg.getAttribute('data-caption') || '') : (currentImg.getAttribute('title') || ''),
              borderRadius: currentImg.style.borderRadius || currentImg.getAttribute("data-border-radius") || ""
            };
            openAltModal(currentData, (newData) => {
              const blot = Quill.find(currentImg);
              if (blot) {
                const index = quill.getIndex(blot);
                quill.formatText(index, 1, 'alt', newData.alt, 'user');
                quill.formatText(index, 1, 'title', newData.title, 'user');
                quill.formatText(index, 1, 'caption', newData.caption, 'user');
                quill.formatText(index, 1, 'borderRadius', newData.borderRadius || '', 'user');
                quill.update('user');
                setTimeout(() => {
                  updateCaptionsList();
                  positionCaptionsDirectly();
                }, 50);
              }
            });
            return;
          }

          const range = quill.getSelection();
          if (range) {
            const [leaf] = quill.getLeaf(range.index);
            if (leaf && leaf.domNode.tagName === 'IMG') {
              const img = leaf.domNode;
              const currentData = {
                alt: img.getAttribute("alt") || "",
                title: img.getAttribute("title") || "",
                caption: img.hasAttribute('data-caption') ? (img.getAttribute('data-caption') || '') : (img.getAttribute('title') || ''),
                borderRadius: img.style.borderRadius || img.getAttribute("data-border-radius") || ""
              };
              openAltModal(currentData, (newData) => {
                const blot = Quill.find(img);
                if (blot) {
                  const index = quill.getIndex(blot);
                  quill.formatText(index, 1, 'alt', newData.alt, 'user');
                  quill.formatText(index, 1, 'title', newData.title, 'user');
                  quill.formatText(index, 1, 'caption', newData.caption, 'user');
                  quill.formatText(index, 1, 'borderRadius', newData.borderRadius || '', 'user');
                  quill.update('user');
                  setSelectionWithoutScroll(quill, range);
                  setTimeout(() => {
                    updateCaptionsList();
                    positionCaptionsDirectly();
                  }, 50);
                }
              });
              return;
            }
          }
          showAlert("Please select an image before editing image properties.");
        },
        align: function (value) {
          const quill = this.quill;
          const currentImg = getActiveImage();

          if (currentImg && quill?.root?.contains(currentImg)) {
            const mode = value === 'right' ? 'right' : value === 'center' ? 'none' : 'left';
            const wrapMode = applyImageWrapDom(currentImg, mode);
            syncImageEditChange(quill);

            setImageWrapMode(wrapMode);
            setTimeout(() => {
              updateResizerRect();
              updateCaptionsList();
              positionCaptionsDirectly();
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
              handleOnChange(quill.root.innerHTML, quill.getContents(), 'user', quill);
            } catch { /* ignore */ }
          }, 0);
        },
        color: function (value) {
          const quill = this.quill;
          const applyColor = (nextValue) => {
            const range = quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;
            if (range?.length > 0) {
              try {
                focusWithoutScroll(quill);
                setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                savedSelectionRef.current = range;
              } catch { /* ignore */ }
              quill.format('color', nextValue || false, 'user');
            } else if (disableImageWrap && quill.getLength?.() > 1) {
              quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'color', nextValue || false, 'user');
            } else {
              if (range) {
                try {
                  focusWithoutScroll(quill);
                  setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                  savedSelectionRef.current = range;
                } catch { /* ignore */ }
              }
              quill.format('color', nextValue || false, 'user');
            }
            window.setTimeout(() => {
              try {
                localEditorHtmlRef.current = quill.root.innerHTML;
                handleOnChange(quill.root.innerHTML, quill.getContents(), 'user', quill);
              } catch { /* ignore */ }
            }, 0);
          };

          if (value === 'custom-color') {
            let picker = document.getElementById('quill-custom-color-picker');
            if (!picker) {
              picker = document.createElement('input');
              picker.id = 'quill-custom-color-picker';
              picker.type = 'color';
              picker.style.position = 'absolute';
              picker.style.width = '1px';
              picker.style.height = '1px';
              picker.style.opacity = '0';
              picker.style.pointerEvents = 'none';
              document.body.appendChild(picker);
            }
            // Position hidden color input below the toolbar button.
            const expandedPicker = document.querySelector('.ql-color.ql-expanded');
            if (expandedPicker) {
              const rect = expandedPicker.getBoundingClientRect();
              picker.style.top = `${rect.top + window.scrollY}px`;
              picker.style.left = `${rect.left + window.scrollX}px`;
            }
            const currentFormat = this.quill.getFormat();
            if (currentFormat && currentFormat.color && currentFormat.color.startsWith('#')) {
              picker.value = currentFormat.color;
            }
            picker.onchange = () => {
              applyColor(picker.value);
            };
            picker.click();
          } else {
            applyColor(value);
          }
        },
        background: function (value) {
          const quill = this.quill;
          const applyBackground = (nextValue) => {
            const range = quill.getSelection() || savedSelectionRef.current || typingSelectionRef.current;
            if (range?.length > 0) {
              try {
                focusWithoutScroll(quill);
                setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                savedSelectionRef.current = range;
              } catch { /* ignore */ }
              quill.format('background', nextValue || false, 'user');
            } else if (disableImageWrap && quill.getLength?.() > 1) {
              quill.formatText(0, Math.max(quill.getLength() - 1, 0), 'background', nextValue || false, 'user');
            } else {
              if (range) {
                try {
                  focusWithoutScroll(quill);
                  setSelectionWithoutScroll(quill, range.index, range.length, 'silent');
                  savedSelectionRef.current = range;
                } catch { /* ignore */ }
              }
              quill.format('background', nextValue || false, 'user');
            }
            window.setTimeout(() => {
              try {
                localEditorHtmlRef.current = quill.root.innerHTML;
                handleOnChange(quill.root.innerHTML, quill.getContents(), 'user', quill);
              } catch { /* ignore */ }
            }, 0);
          };

          if (value === 'custom-color') {
            let picker = document.getElementById('quill-custom-bg-picker');
            if (!picker) {
              picker = document.createElement('input');
              picker.id = 'quill-custom-bg-picker';
              picker.type = 'color';
              picker.style.position = 'absolute';
              picker.style.width = '1px';
              picker.style.height = '1px';
              picker.style.opacity = '0';
              picker.style.pointerEvents = 'none';
              document.body.appendChild(picker);
            }
            // Position hidden color input below the toolbar button.
            const expandedPicker = document.querySelector('.ql-background.ql-expanded');
            if (expandedPicker) {
              const rect = expandedPicker.getBoundingClientRect();
              picker.style.top = `${rect.top + window.scrollY}px`;
              picker.style.left = `${rect.left + window.scrollX}px`;
            }
            const currentFormat = this.quill.getFormat();
            if (currentFormat && currentFormat.background && currentFormat.background.startsWith('#')) {
              picker.value = currentFormat.background;
            }
            picker.onchange = () => {
              applyBackground(picker.value);
            };
            picker.click();
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
    syncImageEditChange,
    handleOnChange,
    focusWithoutScroll,
    setSelectionWithoutScroll,
    updateResizerRect,
    updateCaptionsList,
    updateSizePickerLabel,
    positionCaptionsDirectly,
    positionResizerDirectly,
    commitControlDrafts,
    syncSelectionControlsFromFormat
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
        if (disableImageWrap) {
          quill.insertEmbed(range.index, "image", {
            src: imageSrc,
            alt: "",
            title: "",
            caption: "",
            borderRadius: "",
            wrap: "none"
          }, "user");
          quill.setSelection(range.index + 1);
        } else {
          openAltModal({ alt: "", title: "", caption: "", borderRadius: "" }, (newData) => {
            quill.insertEmbed(range.index, "image", {
              src: imageSrc,
              alt: newData.alt,
              title: newData.title,
              caption: newData.caption,
              borderRadius: newData.borderRadius
            }, "user");
            quill.setSelection(range.index + 1);
          });
        }
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

    const startImg = imageOverride || getActiveImage() || selectedImage;
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
    const maxWidth = Math.max(
      minWidth,
      startImg.naturalWidth || 0,
      (editorRect.width || 0) * 3,
      (containerRef.current?.clientWidth || 0) * 3,
      startRect.width || 0,
      2000
    );
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

    const syncOverlayToImage = () => {
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
        syncOverlayToImage();
        positionResizerDirectly();
        positionCaptionsDirectly();
      });
    };

    const setImageWidth = (width, unit = 'px') => {
      const value = unit === '%' ? `${width}%` : `${Math.round(width)}px`;
      const img = getResizeImage();
      if (!img || !img.isConnected) return;
      img.style.setProperty('width', value, 'important');
      img.style.setProperty('height', 'auto', 'important');
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
      img.setAttribute('width', widthValue);
      liveResizeImage = img;

      if (quill) {
        syncImageEditChange(quill);
      }

      updateResizerRect();
      positionCaptionsDirectly();
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
      if (shouldCommit) {
        commitResize();
      }
      resizeDragRef.current = false;
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
    syncOverlayToImage();
    positionResizerDirectly();

    try {
      event.currentTarget?.setPointerCapture?.(pointerId);
    } catch { /* ignore */ }


    imageResizeSessionRef.current = { cleanup };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onEnd, true);
    document.addEventListener('pointercancel', onCancel, true);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onEnd, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    window.addEventListener('pointercancel', onCancel, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onEnd, true);
  }, [
    enterImageEditMode,
    getActiveImage,
    rememberSelectedImage,
    positionCaptionsDirectly,
    positionResizerDirectly,
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
      if (!img || !quill || !quill.root.contains(img)) return;

      enterImageEditMode(img, quill);

      window.requestAnimationFrame(() => {
        updateResizerRect();
        positionCaptionsDirectly();
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
    positionCaptionsDirectly,
    positionResizerDirectly,
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
      updateCaptionsList();
      positionCaptionsDirectly();
      positionResizerDirectly();
    }, 50);
  }, [getActiveImage, getQuillEditor, applyImageWrapDom, syncImageEditChange, updateResizerRect, updateCaptionsList, positionCaptionsDirectly, positionResizerDirectly]);

  const handleDeleteImage = useCallback(() => {
    const img = getActiveImage();
    if (!img) return;
    const quill = getQuillEditor();
    if (!quill) return;
    const blot = Quill.find(img);
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
      updateCaptionsList();
      positionCaptionsDirectly();
    }, 50);
  }, [getActiveImage, getQuillEditor, syncImageEditChange, rememberSelectedImage, updateCaptionsList, positionCaptionsDirectly]);

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
          title="Image info"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Alt text (SEO)</label>
              <input
                type="text"
                placeholder="Example: classroom for rent in Da Nang..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.alt}
                onChange={(e) => setModalData({ ...modalData, alt: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Hover tooltip (Title)</label>
              <input
                type="text"
                placeholder="Example: Hover over image to show this text..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.title}
                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Caption shown below image</label>
              <input
                type="text"
                placeholder="Example: Modern classroom space..."
                className="w-full px-4 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-primary focus:outline-none transition-colors"
                value={modalData.caption}
                onChange={(e) => setModalData({ ...modalData, caption: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Image border radius (e.g. 8px, 16px, 50%)</label>
              <input
                type="text"
                placeholder="Example: 12px or 24px..."
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
                Cancel</button>
              <Button
                type="button"
                onClick={() => handleModalSubmit()}
                className="flex-1 px-6 py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  const absoluteValue = useMemo(() => {
    if (!props.value || typeof props.value !== 'string') return props.value;
    let val = props.value.replace(/src=["']\/(assets\/[^"']+)["']/gi, `src="${URL_API}$1"`);

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

    return val;
  }, [props.value, hasResponsive, isSimpleTextField]);

  const handleBlur = useCallback(() => {
    if (props.onBlur && lastRelativeContentRef.current != null) {
      props.onBlur(lastRelativeContentRef.current);
    }
    isUserEditingRef.current = false;
    localEditorHtmlRef.current = null;
    setSyncTrigger(prev => !prev);
  }, [props.onBlur]);

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
    }
  }, [getQuillEditor, props.value, syncTrigger]);

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
  if (currentEditor && (isFocused || hasSelectedImage || isUserEditingRef.current || props.value === lastRelativeContentRef.current)) {
    try {
      editorValue = localEditorHtmlRef.current || currentEditor.root.innerHTML;
    } catch {
      editorValue = localEditorHtmlRef.current ?? absoluteValue;
    }
  }

  const { formats: quillFormats, ...quillProps } = props;
  const effectiveLineHeight = getControlValue('lineHeight', lineHeight);
  const effectiveLineHeightMobile = getControlValue('lineHeightMobile', lineHeightMobile);
  const effectiveFontSize = getControlValue('fontSize', fontSize);
  const effectiveFontSizeMobile = getControlValue('fontSizeMobile', fontSizeMobile);
  const effectiveTranslateY = getControlValue('translateY', translateY);
  const effectiveTranslateYMobile = getControlValue('translateYMobile', translateYMobile);
  const isEditingInlineSelection = canUseInlineSelectionControls && !!controlSelectionRef.current?.length;
  const getPreviewControlValue = (key, propValue) => (
    !isEditingInlineSelection && Object.prototype.hasOwnProperty.call(selectionControlDrafts, key)
      ? normalizeUnsignedControlValue(key, selectionControlDrafts[key])
      : commitOnBlurOnly && Object.prototype.hasOwnProperty.call(controlDrafts, key)
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
  const toCssUnit = useCallback((value, allowNegative = false) => {
    const text = String(value || '').trim();
    if (!text) return undefined;
    const integerPattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
    return integerPattern.test(text) ? `${text}px` : text;
  }, []);
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

  useEffect(() => {
    controlPopupOpenRef.current = showFontSizePopup || showSpacingPopup || showTranslatePopup;
    const toolbar = containerRef.current?.querySelector('.ql-toolbar');
    toolbar?.classList.toggle('ql-control-popup-open', controlPopupOpenRef.current);
    if (controlPopupOpenRef.current) {
      toolbar?.classList.add('ql-toolbar-overflowing');
      toolbar?.classList.remove('ql-toolbar-expanded');
    } else {
      controlSelectionRef.current = null;
    }
  }, [showFontSizePopup, showSpacingPopup, showTranslatePopup]);

  useEffect(() => {
    if (!showSpacingPopup) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-line-height-popup');
      const button = containerRef.current?.querySelector('.ql-line-height');
      if (popup && !popup.contains(e.target) && button && !button.contains(e.target)) {
        preserveAdminScrollDuring(() => {
          commitControlInput();
          setShowSpacingPopup(false);
        });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSpacingPopup, commitControlInput, preserveAdminScrollDuring]);

  useEffect(() => {
    if (!showFontSizePopup) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-font-size-popup');
      const button = containerRef.current?.querySelector('.ql-font-size-custom');
      if (popup && !popup.contains(e.target) && button && !button.contains(e.target)) {
        preserveAdminScrollDuring(() => {
          commitControlInput();
          setShowFontSizePopup(false);
        });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showFontSizePopup, commitControlInput, preserveAdminScrollDuring]);

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

  useEffect(() => {
    if (!showTranslatePopup) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-translate-y-popup');
      const button = containerRef.current?.querySelector('.ql-translate-y');
      if (popup && !popup.contains(e.target) && button && !button.contains(e.target)) {
        preserveAdminScrollDuring(() => {
          commitControlInput();
          setShowTranslatePopup(false);
        });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTranslatePopup, commitControlInput, preserveAdminScrollDuring]);

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div
      className={`quill-wrapper-container relative ${className} ${disableImageWrap ? "disable-image-wrap" : ""}${isSticky ? " is-sticky" : ""}${isBlogEditor ? " is-blog-editor" : ""}`}
      ref={containerRef}
      style={{
        '--quill-toolbar-top': toolbarTop,
        '--quill-editor-max-height': maxHeight,
        '--quill-editor-min-height': minHeight,
        '--custom-line-height': globalLineHeight && !String(globalLineHeight).trim().startsWith("-") ? toCssUnit(globalLineHeight) : undefined,
        '--custom-line-height-mobile': globalLineHeightMobile && !String(globalLineHeightMobile).trim().startsWith("-") ? toCssUnit(globalLineHeightMobile) : undefined,
        '--fs-desktop': toCssUnit(previewFontSizeDesktop),
        '--fs-mobile': toCssUnit(previewFontSizeMobile),
        '--fs': activeViewportFontSize,
        '--translate-y': toCssUnit(globalTranslateY, true),
        '--translate-y-mobile': toCssUnit(globalTranslateYMobile, true),
      }}
    >
      {renderModals()}

      {showSpacingPopup && (
        <div
          className="ql-line-height-popup absolute bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[3000]"
          style={{
            top: safeNumber(popupPosition.top) + 5,
            left: Math.max(10, Math.min(safeNumber(popupPosition.left, 10), (containerRef.current?.clientWidth || 500) - 220)),
            width: '200px'
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
                  commitControlInput();
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
                  value={effectiveLineHeight}
                  onChange={(e) => updateControlDraftValue('lineHeight', e.target.value, false, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitControlInput();
                    }
                  }}
                  onBlur={handleControlInputBlur}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => focusControlInput('lineHeight')}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>Điện thoại (px)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Mặc định. VD: 24"
                  value={effectiveLineHeightMobile}
                  onChange={(e) => updateControlDraftValue('lineHeightMobile', e.target.value, false, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitControlInput();
                    }
                  }}
                  onBlur={handleControlInputBlur}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => focusControlInput('lineHeightMobile')}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none"
                onClick={() => {
                  preserveAdminScrollDuring(() => {
                    commitControlInput();
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

      {showFontSizePopup && hasResponsive && (
        <div
          className="ql-font-size-popup absolute bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[3000]"
          style={{
            top: safeNumber(fontSizePopupPosition.top) + 5,
            left: Math.max(10, Math.min(safeNumber(fontSizePopupPosition.left, 10), (containerRef.current?.clientWidth || 500) - 220)),
            width: '210px'
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
                  commitControlInput();
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
                    const current = parseInt(effectiveFontSize) || 16;
                    updateControlValue('fontSize', Math.max(1, current - 1).toString(), onChangeFontSize);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  -
                </button>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={effectiveFontSize}
                    onChange={(e) => updateControlDraftValue('fontSize', e.target.value, false, e.currentTarget)}
                    onKeyDown={(e) => {
                      keepPopupInputKeyInInput(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitControlInput();
                      }
                    }}
                    onBlur={handleControlInputBlur}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => focusPopupInput(e, 'fontSize')}
                    onDoubleClick={keepPopupInteractionStable}
                    onFocus={() => focusControlInput('fontSize')}
                    className="w-10 h-6 text-center bg-white border border-gray-200 rounded text-xs font-semibold text-black placeholder-black placeholder:text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="16"
                  />
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(effectiveFontSize) || 16;
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
                    const current = parseInt(effectiveFontSizeMobile) || 13;
                    updateControlValue('fontSizeMobile', Math.max(1, current - 1).toString(), onChangeFontSizeMobile);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  -
                </button>
                <div className="relative">
                  <input
                    type="text"
                    value={effectiveFontSizeMobile}
                    onChange={(e) => updateControlDraftValue('fontSizeMobile', e.target.value, false, e.currentTarget)}
                    onKeyDown={(e) => {
                      keepPopupInputKeyInInput(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitControlInput();
                      }
                    }}
                    onBlur={handleControlInputBlur}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => focusPopupInput(e, 'fontSizeMobile')}
                    onDoubleClick={keepPopupInteractionStable}
                    onFocus={() => focusControlInput('fontSizeMobile')}
                    className="w-10 h-6 text-center bg-white border border-gray-200 rounded text-xs font-semibold text-black placeholder-black placeholder:text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="13"
                  />
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(effectiveFontSizeMobile) || 13;
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
            top: safeNumber(translatePopupPosition.top) + 5,
            left: Math.max(10, Math.min(safeNumber(translatePopupPosition.left, 10), (containerRef.current?.clientWidth || 500) - 220)),
            width: '200px'
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
                  commitControlInput();
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
                value={effectiveTranslateY}
                onChange={(e) => updateControlDraftValue('translateY', e.target.value, true, e.currentTarget)}
                    onKeyDown={(e) => {
                      keepPopupInputKeyInInput(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitControlInput();
                      }
                    }}
                onBlur={handleControlInputBlur}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => focusControlInput('translateY')}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>Điện thoại (px)</label>
              <input
                type="text"
                placeholder="VD: -10 hoặc 5"
                value={effectiveTranslateYMobile}
                onChange={(e) => updateControlDraftValue('translateYMobile', e.target.value, true, e.currentTarget)}
                    onKeyDown={(e) => {
                      keepPopupInputKeyInInput(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitControlInput();
                      }
                    }}
                onBlur={handleControlInputBlur}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => focusControlInput('translateYMobile')}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none"
                onClick={() => {
                  preserveAdminScrollDuring(() => {
                    commitControlInput();
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
          ref={editorRef}
          {...quillProps}
          value={editorValue}
          onChange={handleOnChange}
          onBlur={handleBlur}
          modules={customModules}
          formats={quillFormats || FORMATS}
        />
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        .quill-wrapper-container {
          position: relative !important;
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
        }

        .quill-wrapper-container .ql-editor.hero-phone-text {
          padding-top: 28px !important;
          min-height: calc(var(--quill-editor-min-height, 120px) + 28px) !important;
        }

        .quill-wrapper-container[style*="--custom-line-height"] .ql-editor {
          line-height: var(--custom-line-height) !important;
        }
        @media (min-width: 768px) {
          .quill-wrapper-container[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text,
          .quill-wrapper-container[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text * {
            line-height: max(var(--custom-line-height), 1.15em) !important;
          }
        }
        @media (max-width: 767px) {
          .quill-wrapper-container[style*="--custom-line-height"] .ql-editor {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .quill-wrapper-container[style*="--custom-line-height"][style*="--fs-mobile"] .ql-editor.hero-phone-text,
          .quill-wrapper-container[style*="--custom-line-height"][style*="--fs-mobile"] .ql-editor.hero-phone-text * {
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
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor {
            font-size: var(--fs-desktop) !important;
          }
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor * {
            font-size: var(--fs-desktop) !important;
          }
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor p:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor span:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor a:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor li:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h1:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h2:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h3:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h4:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h5:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h6:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h1 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h2 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h3 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor h4 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor p *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-desktop"] .ql-editor li *:not([style*="--fs"]):not([style*="font-size"]) {
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
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor,
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor * {
            font-size: var(--fs-mobile) !important;
          }
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor p:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor span:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor a:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor li:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h1:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h2:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h3:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h4:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h5:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h6:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h1 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h2 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h3 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor h4 *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor p *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container[style*="--fs-mobile"] .ql-editor li *:not([style*="--fs"]):not([style*="font-size"]) {
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
          .quill-wrapper-container .ql-editor [style*="--fs-desktop"] * {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .quill-wrapper-container .ql-editor [style*="--fs-mobile"],
          .quill-wrapper-container .ql-editor [style*="--fs-mobile"] * {
            font-size: var(--fs-mobile) !important;
          }
        }
        .quill-wrapper-container .ql-editor [style*="--custom-line-height"],
        .quill-wrapper-container .ql-editor [style*="--custom-line-height"] * {
          line-height: var(--custom-line-height) !important;
        }
        .quill-wrapper-container .ql-editor [style*="--translate-y"] {
          transform: translateY(var(--translate-y)) !important;
        }
        @media (max-width: 767px) {
          .quill-wrapper-container .ql-editor [style*="--custom-line-height-mobile"],
          .quill-wrapper-container .ql-editor [style*="--custom-line-height-mobile"] * {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .quill-wrapper-container .ql-editor [style*="--translate-y-mobile"] {
            transform: translateY(var(--translate-y-mobile, var(--translate-y, 0px))) !important;
          }
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

        .quill-wrapper-container.is-blog-editor .ql-editor {
          font-family: 'Montserrat', sans-serif;
          line-height: 1.6;
          color: #323232;
          padding: 24px 20px !important;
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
        .quill-wrapper-container:not(.is-blog-editor) .ql-editor {
          min-height: inherit;
          max-height: var(--quill-editor-max-height, none) !important;
          overflow-y: auto !important;
        }
        /* 1:1 responsive content widths matching Details page (W - screen-padding) & main-container padding */
        @media (max-width: 639px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 16px !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 20px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        @media (min-width: 1024px) and (max-width: 1239px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 20px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        @media (min-width: 1240px) and (max-width: 1439px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 20px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        @media (min-width: 1440px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 20px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
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
          max-width: none !important;
        }
        .ql-editor img:hover {
          border-color: rgba(26, 148, 255, 0.3);
        }
        .ql-snow .ql-picker.ql-font {
          width: 160px !important;
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
          max-height: 250px !important;
          overflow-y: auto !important;
          padding-top: 0 !important;
        }
        .ql-snow .ql-picker.ql-font > .font-search-wrapper {
          display: none !important;
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          width: 100% !important;
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
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label::before {
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
        ${dynamicFonts.filter(font => font.fileUrl).map(font => `
          @font-face {
            font-family: '${escapeCssString(font.family)}';
            src: url('${escapeCssString(font.fileUrl)}') format('${getFontFormat(font.fileType)}');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `).join('\n')}
        ${dynamicFonts.map(font => `
          .quill-wrapper-container .ql-editor [style*="font-family: ${font.slug}"],
          .quill-wrapper-container .ql-editor [style*="font-family:${font.slug}"],
          .quill-wrapper-container .ql-editor [style*="font-family: '${font.slug}'"],
          .quill-wrapper-container .ql-editor [style*="font-family:'${font.slug}'"],
          .quill-wrapper-container .ql-editor [style*='font-family: "${font.slug}"'],
          .quill-wrapper-container .ql-editor [style*='font-family:"${font.slug}"'] {
            font-family: '${escapeCssString(font.family)}', sans-serif !important;
          }

          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${font.slug}"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${font.slug}"]::before { 
            content: '${escapeCssString(font.name)}' !important; 
            font-family: '${escapeCssString(font.family)}', sans-serif !important;
          }
        `).join('\n')}
        .ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before { content: 'Default' !important; }
        
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-display-value]::before {
          content: attr(data-display-value) !important;
        }

        .ql-snow .ql-picker.ql-size.ql-expanded .ql-picker-options {
          width: 160px !important;
          max-height: 250px !important;
          overflow-y: auto !important;
          padding-top: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-options .ql-picker-item {
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .custom-size-dropdown-apply-btn svg {
          width: 14px !important;
          height: 14px !important;
          float: none !important;
          display: block !important;
          margin: 0 !important;
        }
        
        ${Object.entries(SIZE_MAP).map(([label, value]) => `
          .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${value}"]::before,
          .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${value}"]::before { 
            content: '${label}' !important; 
          }
        `).join('\n')}
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
        .ql-editor h2 {
          clear: both !important;
        }
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h1,
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h2 {
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
          margin-top: 12px !important;
          margin-left: 0 !important;
          display: inline !important;
        }
        .ql-editor img[data-wrap="right"] {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 12px !important;
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


        /* Align top edge of text adjacent to floated images in editor */
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) {
          margin: 0 !important;
          padding: 0 !important;
          height: 0 !important;
          min-height: 0 !important;
          line-height: 0 !important;
          border: none !important;
        }
        .ql-editor > *:has(img[data-wrap="left"], img[data-wrap="right"]) + * {
          margin-top: 0 !important;
        }
        /* Image Caption styling in editor */
        .ql-editor img[data-caption]:not([data-caption=""]):not([data-caption=" "]) {
          margin-bottom: 42px !important;
        }
        .ql-editor img:not([data-caption])[title]:not([title=""]):not([title=" "]) {
          margin-bottom: 42px !important;
        }
        .editor-image-caption {
          position: absolute !important;
          text-align: center !important;
          color: #666666 !important;
          font-style: italic !important;
          line-height: 1.4 !important;
          pointer-events: none !important;
          z-index: 10 !important;
          display: block !important;
          box-sizing: border-box !important;
          padding: 0 4px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
        }
        .quill-wrapper-container.disable-image-wrap .ql-editor img {
          display: block !important;
          margin-left: 0 !important;
          margin-right: auto !important;
          float: none !important;
        }

        @media (max-width: 767px) {
          /* Robust styling reset for Quill Toolbar in admin panel to prevent overrides */
          .quill-wrapper-container .ql-toolbar.ql-snow,
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
          
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-formats {
            display: inline-flex !important;
            align-items: center !important;
            gap: 2px !important;
            margin-right: 15px !important;
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
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"] {
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
            right: auto !important;
            display: grid !important;
            grid-template-columns: repeat(2, 34px) !important;
            width: 96px !important;
            min-width: 76px !important;
            padding: 8px !important;
            gap: 4px !important;
            flex-direction: unset !important;
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
            display: block !important;
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

        .ql-font-size-popup input::placeholder {
          color: #000000 !important;
          opacity: 1 !important;
        }
        .ql-font-size-popup input {
          color: #000000 !important;
        }

        .quill-wrapper-container.quill-editor-describe-phone .ql-editor.hero-phone-text {
          padding: 24px 18px 18px !important;
          min-height: calc(var(--quill-editor-min-height, 120px) + 24px) !important;
          box-sizing: border-box !important;
          line-height: 1.35 !important;
          overflow: visible !important;
        }
        .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"] .ql-editor.hero-phone-text,
        .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text,
        .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-mobile"] .ql-editor.hero-phone-text {
          line-height: 1.35 !important;
        }
        .quill-wrapper-container.quill-editor-describe-phone .ql-editor.hero-phone-text *,
        .quill-wrapper-container.quill-editor-describe-phone .ql-editor.hero-phone-text p,
        .quill-wrapper-container.quill-editor-describe-phone .ql-editor.hero-phone-text span {
          line-height: 1.35 !important;
          overflow: visible !important;
        }
        .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"] .ql-editor.hero-phone-text *,
        .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text *,
        .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-mobile"] .ql-editor.hero-phone-text * {
          line-height: 1.35 !important;
          overflow: visible !important;
        }
        @media (min-width: 768px) {
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text,
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text *,
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text p,
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"][style*="--fs-desktop"] .ql-editor.hero-phone-text span {
            line-height: max(var(--custom-line-height), 1.35em) !important;
            overflow: visible !important;
          }
        }
        @media (max-width: 767px) {
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"] .ql-editor.hero-phone-text,
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"] .ql-editor.hero-phone-text *,
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"] .ql-editor.hero-phone-text p,
          .quill-wrapper-container.quill-editor-describe-phone[style*="--custom-line-height"] .ql-editor.hero-phone-text span {
            line-height: max(var(--custom-line-height-mobile, var(--custom-line-height)), 1.35em) !important;
            overflow: visible !important;
          }
        }
        .quill-wrapper-container.quill-editor-describe-phone .ql-toolbar.ql-snow + .ql-container.ql-snow {
          margin-top: 18px !important;
          border-top-left-radius: 12px !important;
          border-top-right-radius: 12px !important;
          overflow: visible !important;
        }

        .quill-wrapper-container,
        .quill-wrapper-container .ql-container,
        .quill-wrapper-container .ql-editor {
          overflow-anchor: none !important;
        }
      `}} />

      {isMounted && resizerRect && createPortal((
        <div
          ref={resizerOverlayRef}
          className="fixed"
          draggable={false}
          style={{
            top: resizerRect.top,
            left: resizerRect.left,
            width: resizerRect.width,
            height: resizerRect.height,
            border: '2px solid #1A94FF',
            boxShadow: '0 0 10px rgba(26, 148, 255, 0.3)',
            pointerEvents: 'auto',
            touchAction: 'none',
            userSelect: 'none',
            zIndex: 10000,
          }}
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Text Wrapping Toolbar */}
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

      {captions.map((cap, idx) => (
        <div
          key={idx}
          className="editor-image-caption"
          style={{
            top: cap.top + 12,
            left: cap.left,
            width: cap.width,
          }}
        >
          {cap.text}
        </div>
      ))}
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
    prevProps.inlineSelectionControls === nextProps.inlineSelectionControls &&
    prevProps.commitOnBlurOnly === nextProps.commitOnBlurOnly &&
    prevProps.theme === nextProps.theme
  );
});

MemoizedQuillWrapper.displayName = "MemoizedQuillWrapper";
export default MemoizedQuillWrapper;
