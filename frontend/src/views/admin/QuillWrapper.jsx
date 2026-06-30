/* eslint-disable react/prop-types */
/* global process */
import React, { forwardRef, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Modal from "@/components/admin/Modal";
import { Input, Button } from "@material-tailwind/react";

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

    Quill.register(altAttributor, true);
    Quill.register(titleAttributor, true);
    Quill.register(captionAttributor, true);
    Quill.register(wrapAttributor, true);
    Quill.register(borderRadiusAttributor, true);
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
  "alt", "title", "caption", "borderRadius"
];

const slugify = (name) => name.trim().toLowerCase().replace(/\s+/g, '-');

const stripFontSizeFromStyle = (styleContent) => {
  return styleContent
    .split(';')
    .map(part => part.trim())
    .filter(part => {
      if (!part) return false;
      const lower = part.toLowerCase();
      return !lower.startsWith('font-size') && !lower.startsWith('--fs');
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

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const cleanStyleForSave = (styleContent) => {
  const parts = styleContent.split(';');
  let fontSizeValue = null;
  let customSizeValue = null;
  let otherStyles = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    const fsMatch = part.match(/^--fs:\s*(.+)$/i);
    if (fsMatch) {
      customSizeValue = fsMatch[1].trim();
      continue;
    }

    const fontSizeMatch = part.match(/^font-size:\s*(.+)$/i);
    if (fontSizeMatch) {
      const val = fontSizeMatch[1].trim();
      if (val.toLowerCase() !== 'var(--fs)') {
        fontSizeValue = val;
      }
      continue;
    }

    otherStyles.push(part);
  }

  const activeSize = fontSizeValue || customSizeValue;
  if (activeSize) {
    const othersStr = otherStyles.length > 0 ? `; ${otherStyles.join('; ')}` : '';
    return `font-size: ${activeSize}${othersStr}`;
  } else {
    return otherStyles.join('; ');
  }
};

const cleanStyleForEdit = (styleContent) => {
  const parts = styleContent.split(';');
  let fontSizeValue = null;
  let customSizeValue = null;
  let otherStyles = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    const fsMatch = part.match(/^--fs:\s*(.+)$/i);
    if (fsMatch) {
      customSizeValue = fsMatch[1].trim();
      continue;
    }

    const fontSizeMatch = part.match(/^font-size:\s*(.+)$/i);
    if (fontSizeMatch) {
      const val = fontSizeMatch[1].trim();
      if (val.toLowerCase() !== 'var(--fs)') {
        fontSizeValue = val;
      }
      continue;
    }

    otherStyles.push(part);
  }

  const activeSize = fontSizeValue || customSizeValue;
  if (activeSize) {
    const othersStr = otherStyles.length > 0 ? `; ${otherStyles.join('; ')}` : '';
    return `font-size: ${activeSize}${othersStr}`;
  } else {
    return otherStyles.join('; ');
  }
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
  ...props
}, ref) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [showSpacingPopup, setShowSpacingPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const [fontSizePopupPosition, setFontSizePopupPosition] = useState({ top: 0, left: 0 });
  const [activeDropdown, setActiveDropdown] = useState(null); // 'desktop' | 'mobile' | null
  const [showTranslatePopup, setShowTranslatePopup] = useState(false);
  const [translatePopupPosition, setTranslatePopupPosition] = useState({ top: 0, left: 0 });
  const [modules, setModules] = useState(null);
  const [dynamicFonts, setDynamicFonts] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const selectedImageRef = useRef(null);
  const selectedImageSrcRef = useRef("");
  const [imageWrapMode, setImageWrapMode] = useState('none');
  const [resizerRect, setResizerRect] = useState(null);
  const resizerOverlayRef = useRef(null);
  const containerClickRef = useRef(null);
  const [captions, setCaptions] = useState([]);
  const savedSelectionRef = useRef(null);
  const lastRelativeContentRef = useRef("");

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
    selectedImageRef.current = img;
    selectedImageSrcRef.current = img?.getAttribute('src') || "";
    setSelectedImage(img || null);
    setImageWrapMode(img?.getAttribute('data-wrap') || 'none');
  }, []);

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

  const hasOnChangeFontSize = !!onChangeFontSize;
  const hasOnChangeFontSizeMobile = !!onChangeFontSizeMobile;

  const hasResponsive = useMemo(() => {
    return hasResponsiveFontSize !== undefined 
      ? hasResponsiveFontSize 
      : (hasOnChangeFontSize && hasOnChangeFontSizeMobile);
  }, [hasResponsiveFontSize, hasOnChangeFontSize, hasOnChangeFontSizeMobile]);

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
          const top = imgRect.bottom - wrapperRect.top + 6;
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
          resizer.style.display = isOutside ? 'none' : 'block';
        } else {
          resizer.style.display = width === 0 || height === 0 ? 'none' : 'block';
        }
      } catch (e) { }
    }
  }, []);

  const syncSelectedImageRect = useCallback(() => {
    let img = selectedImageRef.current;
    if (!img || !containerRef.current) {
      setResizerRect(null);
      return;
    }

    if (!img.isConnected) {
      const src = img.getAttribute('src');
      const editor = containerRef.current.querySelector('.ql-editor');
      const nextImg = src && editor
        ? Array.from(editor.querySelectorAll('img')).find(i => i.getAttribute('src') === src)
        : null;
      if (nextImg) {
        img = nextImg;
        rememberSelectedImage(nextImg);
      }
    }

    if (!img.isConnected) {
      setResizerRect(null);
      return;
    }

    try {
      const imgRect = img.getBoundingClientRect();
      const editor = containerRef.current.querySelector('.ql-editor');
      const editorRect = editor?.getBoundingClientRect();
      const isOutside = editorRect && (imgRect.bottom < editorRect.top || imgRect.top > editorRect.bottom);

      if (isOutside || imgRect.width === 0 || imgRect.height === 0) {
        setResizerRect(null);
      } else {
        setResizerRect({
          top: imgRect.top,
          left: imgRect.left,
          width: imgRect.width,
          height: imgRect.height
        });
      }
    } catch (e) {
      setResizerRect(null);
    }
  }, [rememberSelectedImage]);

  useEffect(() => {
    positionCaptionsDirectly();
  }, [captions, positionCaptionsDirectly]);

  const updateSizePickerLabel = useCallback(() => {
    const quill = editorRef.current?.getEditor();
    if (!quill || !containerRef.current) return;

    let format = {};
    try {
      let selection = quill.getSelection();
      if (!selection && quill.getLength() > 0) {
        selection = { index: 0, length: 0 };
      }
      format = selection ? quill.getFormat(selection) : {};
    } catch (e) { }

    const size = format.size;
    const sizePickers = containerRef.current.querySelectorAll('.ql-size.ql-picker');
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
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const quill = editorRef.current?.getEditor();
    if (!quill) return;

    // ── Giữ highlight selection khi click toolbar (như Word/Google Docs) ──
    const container = containerRef.current;

    const handleMousedown = (e) => {
      const toolbar = container.querySelector('.ql-toolbar');
      if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) {
        // Không block các input/textarea bên trong toolbar (search font, size input...)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Cho phép cuộn các danh sách dropdown khi kéo thanh cuộn
        const isScrollbarClick = e.target.scrollHeight > e.target.clientHeight && e.offsetX > e.target.clientWidth;
        if (isScrollbarClick) return;

        const quillInstance = editorRef.current?.getEditor();
        if (quillInstance) {
          const sel = quillInstance.getSelection();
          if (sel) {
            savedSelectionRef.current = sel;
          }
        }
        // Ngăn editor mất focus khi click toolbar
        e.preventDefault();
      }
    };

    const handleMouseup = (e) => {
      const toolbar = container.querySelector('.ql-toolbar');
      if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const quillInstance = editorRef.current?.getEditor();
        if (quillInstance) {
          const saved = savedSelectionRef.current;
          if (saved) {
            // Đợi Quill xử lý format xong rồi mới restore
            setTimeout(() => {
              try {
                quillInstance.focus();
                quillInstance.setSelection(saved.index, saved.length);
              } catch (e2) { }
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
            } catch (e) { }
          }, 10);
        }
      });
    }

    const handleScrollOrResize = () => {
      positionCaptionsDirectly();
      positionResizerDirectly();
    };

    const handleContentChange = () => {
      updateCaptionsList();
      syncCustomFontSizes();
      setTimeout(() => {
        positionCaptionsDirectly();
        positionResizerDirectly();
      }, 0);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

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
        } catch (e) { }
      }
    }, 100);

    return () => {
      container.removeEventListener('mousedown', handleMousedown, true);
      container.removeEventListener('mouseup', handleMouseup, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      resizeObserver.disconnect();
      quill.off('selection-change', updateSizePickerLabel);
      quill.off('text-change', updateSizePickerLabel);
      quill.off('text-change', handleContentChange);
    };
  }, [isReady, updateCaptionsList, positionCaptionsDirectly, positionResizerDirectly, updateSizePickerLabel]);



  useEffect(() => {
    if (!isReady) return;

    const initSearch = () => {
      const pickers = containerRef.current?.querySelectorAll('.ql-font .ql-picker-options');
      if (!pickers) return;

      pickers.forEach(picker => {
        if (!picker.querySelector('.font-search-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'font-search-wrapper';
          wrapper.innerHTML = '<input type="text" placeholder="Tìm kiếm font..." class="font-search-input" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;" />';
          wrapper.style.padding = '8px';
          wrapper.style.position = 'sticky';
          wrapper.style.top = '0';
          wrapper.style.backgroundColor = '#fff';
          wrapper.style.zIndex = '10';
          wrapper.style.borderBottom = '1px solid #f1f1f1';
          wrapper.style.marginBottom = '4px';

          const input = wrapper.querySelector('input');
          input.onclick = (e) => e.stopPropagation();
          input.onmousedown = (e) => e.stopPropagation();
          input.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') e.preventDefault();
          };
          input.onkeyup = (e) => {
            e.stopPropagation();
            const search = e.target.value.toLowerCase().replace(/[-_ ]/g, '');
            const items = picker.querySelectorAll('.ql-picker-item');
            items.forEach(item => {
              const rawVal = item.getAttribute('data-value') || 'macdinh';
              const val = rawVal.toLowerCase().replace(/[-_ ]/g, '');
              const label = item.textContent ? item.textContent.toLowerCase().replace(/[-_ ]/g, '') : '';
              if (val.includes(search) || label.includes(search) || rawVal === 'macdinh') {
                item.style.display = 'block';
              } else {
                item.style.display = 'none';
              }
            });
          };

          picker.appendChild(wrapper);
        }
      });
    };

    const interval = setInterval(initSearch, 1000);
    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const initDropdown = () => {
      const toolbar = containerRef.current.querySelector('.ql-toolbar');
      if (!toolbar) return;

      const formats = Array.from(toolbar.children).filter(el => el.classList.contains('ql-formats'));
      const moreGroup = formats.find(f => f.querySelector('.ql-more'));
      if (!moreGroup) return;

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
          const hasList = f.querySelector('.ql-list');
          const hasAlign = f.querySelector('.ql-align');
          const hasLinkImage = f.querySelector('.ql-link') || f.querySelector('.ql-image');
          const hasClean = f.querySelector('.ql-clean');

          if (hasColor || hasList || hasAlign || hasLinkImage || hasClean) {
            dropdown.appendChild(f);
          }
        });
      }
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

  React.useImperativeHandle(ref, () => ({
    getEditor: () => {
      try {
        return editorRef.current?.getEditor();
      } catch (e) {
        return null;
      }
    },
    focus: () => {
      try {
        editorRef.current?.focus();
      } catch (e) { }
    },
    blur: () => {
      try {
        editorRef.current?.blur();
      } catch (e) { }
    },
  }));

  useEffect(() => {
    const initFonts = async () => {
      if (!cachedFonts) {
        if (!fetchPromise) {
          fetchPromise = (async () => {
            try {
              const googleRes = await fetch(`${URL_API}api/fonts`);
              let googleFonts = [];
              if (googleRes.ok) {
                const data = await googleRes.json();
                googleFonts = data
                  .filter(f => f.name.trim().toLowerCase() !== 'inter')
                  .map(f => ({
                    name: f.name.trim(),
                    slug: slugify(f.name),
                    family: f.name.trim()
                  }));
              }

              const localRes = await fetch(`${URL_API}api/fonts/local`);
              let localFonts = [];
              if (localRes.ok) {
                const result = await localRes.json();
                if (result.success && Array.isArray(result.data)) {
                  localFonts = result.data
                    .filter(f => f.status === 'active')
                    .map(f => ({
                      name: f.display_name,
                      slug: f.font_family,
                      family: f.font_family,
                      fileUrl: resolveAssetUrl(f.file_url),
                      fileType: f.file_type
                    }));
                }
              }
              const combined = [...googleFonts, ...localFonts];
              const sorted = combined.sort((a, b) => a.name.localeCompare(b.name));
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
      const toolbarFontValues = ['macdinh', ...currentFonts.map(f => f.slug)];
      const showSpacingAndTranslation = hasLineHeight || hasTranslateY;
      setModules(createModules(toolbarFontValues, hasResponsive, showSpacingAndTranslation));
      setIsReady(true);
    }
  }, [dynamicFonts, hasResponsive, hasLineHeight, hasTranslateY]);

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
    const qlEditor = containerRef.current.querySelector('.ql-editor');
    if (qlEditor) {
      syncEditorState(qlEditor);
    }

    // Set up a unified MutationObserver on the stable containerRef to observe all subtree modifications and attributes
    const observer = new MutationObserver(() => {
      const activeEditor = containerRef.current?.querySelector('.ql-editor');
      if (activeEditor) {
        observer.disconnect();
        syncEditorState(activeEditor);
        observer.observe(containerRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Also register Quill text/selection change listeners for high-frequency updates
    let currentEditor = null;
    const onTextChange = () => {
      const activeEditor = containerRef.current?.querySelector('.ql-editor');
      if (activeEditor) syncEditorState(activeEditor);
    };
    const onSelectionChange = () => {
      const activeEditor = containerRef.current?.querySelector('.ql-editor');
      if (activeEditor) syncEditorState(activeEditor);
    };

    const isSimpleField = className.includes('describe-phone') || className.includes('describe-quote-text');
    let handlePaste = null;

    const quill = editorRef.current?.getEditor();
    if (quill) {
      quill.on('text-change', onTextChange);
      quill.on('selection-change', onSelectionChange);
      currentEditor = quill;

      if (isSimpleField) {
        handlePaste = (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text/plain');
          const range = quill.getSelection();
          if (range) {
            quill.insertText(range.index, text);
            quill.setSelection(range.index + text.length);
          } else {
            quill.setText(text);
          }
        };
        quill.root.addEventListener('paste', handlePaste);
      }
    }

    return () => {
      observer.disconnect();
      if (currentEditor) {
        currentEditor.off('text-change', onTextChange);
        currentEditor.off('selection-change', onSelectionChange);
        if (handlePaste) {
          try {
            currentEditor.root.removeEventListener('paste', handlePaste);
          } catch (err) {}
        }
      }
    };
  }, [isReady, editorClassName, className]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const initSizeInput = () => {
      const sizePickers = containerRef.current.querySelectorAll('.ql-size.ql-picker');
      sizePickers.forEach(picker => {
        const label = picker.querySelector('.ql-picker-label');
        if (!label || label.getAttribute('data-input-initialized')) return;
        label.setAttribute('data-input-initialized', 'true');

        // Watch for changes on data-value attribute to extract numbers
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-value') {
              const quill = editorRef.current?.getEditor();
              if (quill) {
                let format = {};
                try {
                  const sel = quill.getSelection();
                  format = sel ? quill.getFormat(sel) : {};
                } catch (e) { }
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

        const quill = editorRef.current?.getEditor();
        let initialVal = label.getAttribute('data-value');
        if (quill) {
          let format = {};
          try {
            const sel = quill.getSelection();
            format = sel ? quill.getFormat(sel) : {};
          } catch (e) { }
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

          const quill = editorRef.current?.getEditor();
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
          } catch (e) { }
          let currentSizeVal = '16';
          if (currentFormat && currentFormat.size) {
            currentSizeVal = currentFormat.size.replace('px', '');
          }
          input.value = currentSizeVal;

          label.style.display = 'none';
          picker.insertBefore(input, label);

          input.focus();
          input.select();

          const applySizeAndClose = () => {
            let val = input.value.trim();
            if (val) {
              // Hỗ trợ cả số nguyên và số thập phân tự động thêm px (ví dụ: 15 hoặc 15.5)
              if (/^\d+(\.\d+)?$/.test(val)) {
                val = `${val}px`;
              }
              quill.focus();
              quill.format('size', val);
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
              <input type="text" placeholder="Nhập cỡ..." class="custom-size-dropdown-input" style="flex: 1; min-width: 0; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; outline: none; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; height: 26px; line-height: 26px; color: #333; background: #fff;" />
              <span class="custom-size-dropdown-apply-btn" style="width: 26px; height: 26px; min-width: 26px; flex-shrink: 0; background: #799f85; color: #fff; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; line-height: 26px; text-align: center; font-family: system-ui, -apple-system, sans-serif; transition: background 0.2s;" title="Áp dụng">✓</span>
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
            const quillInstance = editorRef.current?.getEditor();
            if (!quillInstance) return;

            let val = input.value.trim();
            if (val) {
              if (/^\d+(\.\d+)?$/.test(val)) {
                val = `${val}px`;
              }

              const savedSel = savedSelectionRef.current;
              if (savedSel) {
                quillInstance.focus();
                quillInstance.setSelection(savedSel.index, savedSel.length);
              }

              quillInstance.format('size', val);
              picker.classList.remove('ql-expanded');
              updateSizePickerLabel();
            }
          };

          input.addEventListener('blur', handleApply);

          // Populate initial value in dropdown input if available
          let currentFormat = {};
          try {
            const currentQuill = editorRef.current?.getEditor();
            if (currentQuill) {
              const sel = currentQuill.getSelection();
              currentFormat = sel ? currentQuill.getFormat(sel) : {};
            }
          } catch (e) { }
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
  }, [isReady, updateSizePickerLabel]);

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
          positionResizerDirectly();
          positionCaptionsDirectly();
        });
      };

      window.addEventListener('resize', schedulePosition);
      window.addEventListener('scroll', schedulePosition, true);
      return () => {
        if (frameId) window.cancelAnimationFrame(frameId);
        window.removeEventListener('resize', schedulePosition);
        window.removeEventListener('scroll', schedulePosition, true);
      };
    } else {
      setResizerRect(null);
    }
  }, [selectedImage, syncSelectedImageRect, updateCaptionsList, positionResizerDirectly, positionCaptionsDirectly]);

  const handleContainerClick = useCallback((ev) => {
    // If clicking inside the resizer overlay or wrap toolbar, do not deselect
    if (resizerOverlayRef.current && resizerOverlayRef.current.contains(ev.target)) {
      return;
    }

    const img = ev.target.closest && ev.target.closest('img');
    const quill = editorRef.current?.getEditor();
    if (!quill) return;

    if (img && quill.root.contains(img)) {
      rememberSelectedImage(img);
      return;
    }

    // Clicked outside image — deselect
    if (selectedImageRef.current) {
      rememberSelectedImage(null);
      setTimeout(() => {
        updateCaptionsList();
        positionCaptionsDirectly();
      }, 50);
    }
  }, [rememberSelectedImage, updateCaptionsList, positionCaptionsDirectly]);

  const handleContainerDblClick = useCallback((ev) => {
    if (disableImageWrap) return; // Do not open image info pop-up on double click for rooms!
    const img = ev.target.closest && ev.target.closest('img');
    const quill = editorRef.current?.getEditor();
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

      const escapedUrlApi = URL_API.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`src=["']${escapedUrlApi}(assets\/[^"']+)["']`, 'gi');
      let relativeContent = content.replace(regex, 'src="/$1"');
      relativeContent = relativeContent.replace(/src=["']https?:\/\/[^\/]+\/(assets\/[^"']+)["']/gi, 'src="/$1"');

      const shouldStripInlineFontSize = hasResponsive || className.includes('describe-phone') || className.includes('describe-quote-text');
      if (shouldStripInlineFontSize) {
        relativeContent = relativeContent.replace(/style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
          const cleaned = stripFontSizeFromStyle(styleContent);
          return cleaned ? `style=${quote}${cleaned}${quote}` : "";
        });
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
      props.onChange(relativeContent, delta, source, editor);
    }
  }, [props.onChange, props.value, className, hasResponsive]);

  const syncImageEditChange = useCallback((quill) => {
    if (!quill) return;
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
        'font-size-custom': function () {
          const button = containerRef.current?.querySelector('.ql-font-size-custom');
          if (button && containerRef.current) {
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
                  quill.setSelection(range);
                  setTimeout(() => {
                    updateCaptionsList();
                    positionCaptionsDirectly();
                  }, 50);
                }
              });
              return;
            }
          }
          showAlert("Vui lòng chọn một hình ảnh trước khi chỉnh sửa thuộc tính.");
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

          quill.format('align', value);
        },
        color: function (value) {
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
            // Định vị input ẩn ngay dưới nút bấm để hộp thoại màu của trình duyệt mở đúng vị trí dưới nút màu
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
              this.quill.format('color', picker.value);
            };
            picker.click();
          } else {
            this.quill.format('color', value);
          }
        },
        background: function (value) {
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
            // Định vị input ẩn ngay dưới nút bấm để hộp thoại màu của trình duyệt mở đúng vị trí dưới nút màu
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
              this.quill.format('background', picker.value);
            };
            picker.click();
          } else {
            this.quill.format('background', value);
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
    updateResizerRect,
    updateCaptionsList,
    positionCaptionsDirectly,
    positionResizerDirectly
  ]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const quill = editorRef.current?.getEditor();
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
        showAlert("Lỗi tải ảnh");
      }
    } catch (error) {
      console.error(error);
      showAlert("Lỗi kết nối");
    } finally {
      e.target.value = "";
    }
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const img = getActiveImage();
    if (!img) return;

    e.currentTarget?.setPointerCapture?.(e.pointerId);

    const initialRect = img.getBoundingClientRect();
    const startWidth = initialRect.width;
    const editor = containerRef.current?.querySelector('.ql-editor');
    const editorRect = editor?.getBoundingClientRect();
    const maxWidth = Math.max(80, editorRect?.width || containerRef.current?.clientWidth || startWidth);
    const minWidth = Math.min(80, maxWidth);
    const startX = e.clientX;
    const isRight = direction.includes('right');
    let currentWidth = startWidth;

    document.body.style.cursor = direction.includes('right') === direction.includes('top') ? 'nesw-resize' : 'nwse-resize';
    document.body.style.userSelect = 'none';
    img.style.setProperty('height', 'auto', 'important');

    const applyWidth = (width) => {
      currentWidth = Math.max(minWidth, Math.min(width, maxWidth));
      img.style.setProperty('width', `${currentWidth}px`, 'important');
      img.setAttribute('width', `${Math.round(currentWidth)}px`);
      positionResizerDirectly();
      positionCaptionsDirectly();
    };

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      applyWidth(isRight ? startWidth + deltaX : startWidth - deltaX);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const percentageWidth = Math.round((currentWidth / maxWidth) * 100);
      const widthValue = percentageWidth >= 95 ? "100%" : `${Math.round(currentWidth)}px`;

      img.style.setProperty('width', widthValue, 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.setAttribute('width', widthValue);

      const quill = editorRef.current?.getEditor();
      if (quill) {
        syncImageEditChange(quill);
      }

      updateResizerRect();
      positionCaptionsDirectly();
      positionResizerDirectly();
    };

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
  };

  useEffect(() => {
    const overlay = resizerOverlayRef.current;
    if (!overlay || !resizerRect) return;

    const getDirectionFromPointer = (event) => {
      const handle = event.target?.closest?.('.resizer-handle');
      if (handle && overlay.contains(handle)) return handle.dataset.dir;

      const rect = overlay.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = 34;
      const nearLeft = x <= hit;
      const nearRight = rect.width - x <= hit;
      const nearTop = y <= hit;
      const nearBottom = rect.height - y <= hit;

      if (nearLeft && nearTop) return 'top-left';
      if (nearRight && nearTop) return 'top-right';
      if (nearLeft && nearBottom) return 'bottom-left';
      if (nearRight && nearBottom) return 'bottom-right';
      return null;
    };

    const handlePointerDown = (event) => {
      const direction = getDirectionFromPointer(event);
      if (!direction) return;
      handleResizeStart(event, direction);
    };

    overlay.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      overlay.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [resizerRect, selectedImage]);

  const handleImageWrap = useCallback((mode) => {
    const img = getActiveImage();
    if (!img) return;
    const quill = editorRef.current?.getEditor();
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
  }, [getActiveImage, applyImageWrapDom, syncImageEditChange, updateResizerRect, updateCaptionsList, positionCaptionsDirectly, positionResizerDirectly]);

  const handleDeleteImage = useCallback(() => {
    const img = getActiveImage();
    if (!img) return;
    const quill = editorRef.current?.getEditor();
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
  }, [getActiveImage, syncImageEditChange, rememberSelectedImage, updateCaptionsList, positionCaptionsDirectly]);

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
          title="Thông báo"
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
              Đã hiểu
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thông tin hình ảnh"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Mô tả ảnh (SEO - Thẻ Alt)</label>
              <Input
                size="lg"
                autoFocus
                placeholder="Ví dụ: phòng học cho thuê đà nẵng..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.alt}
                onChange={(e) => setModalData({ ...modalData, alt: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Hiển thị khi hover chuột (Thẻ Title)</label>
              <Input
                size="lg"
                placeholder="Ví dụ: Di chuột vào ảnh sẽ hiện dòng chữ này..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.title}
                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Chú thích hiển thị dưới ảnh</label>
              <Input
                size="lg"
                placeholder="Ví dụ: Không gian phòng học hiện đại..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.caption}
                onChange={(e) => setModalData({ ...modalData, caption: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Bo góc ảnh (ví dụ: 8px, 16px, 50%)</label>
              <Input
                size="lg"
                placeholder="Ví dụ: 12px hoặc 24px..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
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
                Hủy bỏ
              </button>
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
    let val = props.value.replace(/src=["']\/(assets\/[^"']+)["']/gi, `src="${URL_API}$1"`);

    const shouldStripInlineFontSize = hasResponsive || className.includes('describe-phone') || className.includes('describe-quote-text');
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
  }, [props.value, className, hasResponsive]);

  let editorValue = absoluteValue;
  let isFocused = false;
  let currentEditor = null;
  try {
    currentEditor = editorRef.current?.getEditor?.();
    isFocused = !!currentEditor?.hasFocus?.();
  } catch (e) {
    currentEditor = null;
  }
  const hasSelectedImage = !!selectedImageRef.current;
  if (currentEditor && (isFocused || hasSelectedImage || props.value === lastRelativeContentRef.current)) {
    try {
      editorValue = currentEditor.root.innerHTML;
    } catch (e) {
      editorValue = absoluteValue;
    }
  }

  useEffect(() => {
    if (!showSpacingPopup) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-line-height-popup');
      const button = containerRef.current?.querySelector('.ql-line-height');
      if (popup && !popup.contains(e.target) && button && !button.contains(e.target)) {
        setShowSpacingPopup(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSpacingPopup]);

  useEffect(() => {
    if (!showFontSizePopup) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-font-size-popup');
      const button = containerRef.current?.querySelector('.ql-font-size-custom');
      if (popup && !popup.contains(e.target) && button && !button.contains(e.target)) {
        setShowFontSizePopup(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showFontSizePopup]);

  useEffect(() => {
    if (!activeDropdown) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-font-size-popup');
      if (popup && popup.contains(e.target)) {
        return;
      }
      setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeDropdown]);

  useEffect(() => {
    if (!showTranslatePopup) return;
    const handleOutsideClick = (e) => {
      const popup = containerRef.current?.querySelector('.ql-translate-y-popup');
      const button = containerRef.current?.querySelector('.ql-translate-y');
      if (popup && !popup.contains(e.target) && button && !button.contains(e.target)) {
        setShowTranslatePopup(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTranslatePopup]);

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div
      className={`quill-wrapper-container relative ${className} ${disableImageWrap ? "disable-image-wrap" : ""}${isSticky ? " is-sticky" : ""}${isBlogEditor ? " is-blog-editor" : ""}`}
      ref={containerRef}
      style={{
        '--quill-toolbar-top': toolbarTop,
        '--quill-editor-max-height': maxHeight,
        '--quill-editor-min-height': minHeight,
        '--custom-line-height': lineHeight ? (/^\d+$/.test(String(lineHeight).trim()) ? `${lineHeight}px` : lineHeight) : undefined,
        '--custom-line-height-mobile': lineHeightMobile ? (/^\d+$/.test(String(lineHeightMobile).trim()) ? `${lineHeightMobile}px` : lineHeightMobile) : undefined,
        '--fs-desktop': fontSize ? (/^\d+$/.test(String(fontSize).trim()) ? `${fontSize}px` : fontSize) : undefined,
        '--fs-mobile': fontSizeMobile ? (/^\d+$/.test(String(fontSizeMobile).trim()) ? `${fontSizeMobile}px` : fontSizeMobile) : undefined,
        '--translate-y': translateY ? (/^-?\d+$/.test(String(translateY).trim()) ? `${translateY}px` : translateY) : undefined,
        '--translate-y-mobile': translateYMobile ? (/^-?\d+$/.test(String(translateYMobile).trim()) ? `${translateYMobile}px` : translateYMobile) : undefined,
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>Giãn dòng</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowSpacingPopup(false)}
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>🖥️ Desktop (px)</label>
                <input
                  type="text"
                  placeholder="Mặc định. VD: 32"
                  value={lineHeight || ""}
                  onChange={(e) => onChangeLineHeight && onChangeLineHeight(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>📱 Mobile (px)</label>
                <input
                  type="text"
                  placeholder="Mặc định. VD: 24"
                  value={lineHeightMobile || ""}
                  onChange={(e) => onChangeLineHeightMobile && onChangeLineHeightMobile(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none"
                onClick={() => setShowSpacingPopup(false)}
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>Cỡ chữ</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowFontSizePopup(false)}
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            {/* Desktop size control */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                🖥️ Desktop
              </span>
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(fontSize) || 16;
                    if (onChangeFontSize) onChangeFontSize(Math.max(1, current - 1).toString());
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  −
                </button>
                <div className="relative">
                  <input
                    type="text"
                    value={fontSize || ""}
                    onChange={(e) => onChangeFontSize && onChangeFontSize(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(prev => prev === 'desktop' ? null : 'desktop');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-10 h-6 text-center bg-white border border-gray-200 rounded text-xs font-semibold text-black placeholder-black placeholder:text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="16"
                  />
                  {activeDropdown === 'desktop' && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto z-[3500] w-14 scrollbar-thin">
                      {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96].map((sz) => (
                        <div
                          key={sz}
                          onClick={() => {
                            if (onChangeFontSize) onChangeFontSize(sz.toString());
                            setActiveDropdown(null);
                          }}
                          className={`py-1 text-center text-[11px] hover:bg-primary/10 hover:text-primary cursor-pointer font-medium ${parseInt(fontSize) === sz ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700'}`}
                        >
                          {sz}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(fontSize) || 16;
                    if (onChangeFontSize) onChangeFontSize((current + 1).toString());
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
                📱 Mobile
              </span>
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(fontSizeMobile) || 13;
                    if (onChangeFontSizeMobile) onChangeFontSizeMobile(Math.max(1, current - 1).toString());
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none"
                >
                  −
                </button>
                <div className="relative">
                  <input
                    type="text"
                    value={fontSizeMobile || ""}
                    onChange={(e) => onChangeFontSizeMobile && onChangeFontSizeMobile(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(prev => prev === 'mobile' ? null : 'mobile');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-10 h-6 text-center bg-white border border-gray-200 rounded text-xs font-semibold text-black placeholder-black placeholder:text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="13"
                  />
                  {activeDropdown === 'mobile' && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto z-[3500] w-14 scrollbar-thin">
                      {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96].map((sz) => (
                        <div
                          key={sz}
                          onClick={() => {
                            if (onChangeFontSizeMobile) onChangeFontSizeMobile(sz.toString());
                            setActiveDropdown(null);
                          }}
                          className={`py-1 text-center text-[11px] hover:bg-primary/10 hover:text-primary cursor-pointer font-medium ${parseInt(fontSizeMobile) === sz ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700'}`}
                        >
                          {sz}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = parseInt(fontSizeMobile) || 13;
                    if (onChangeFontSizeMobile) onChangeFontSizeMobile((current + 1).toString());
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>Cấu hình dịch dòng</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowTranslatePopup(false)}
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>🖥️ Desktop (px)</label>
              <input
                type="text"
                placeholder="VD: -20 hoặc 10"
                value={translateY || ""}
                onChange={(e) => onChangeTranslateY && onChangeTranslateY(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>📱 Mobile (px)</label>
              <input
                type="text"
                placeholder="VD: -10 hoặc 5"
                value={translateYMobile || ""}
                onChange={(e) => onChangeTranslateYMobile && onChangeTranslateYMobile(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none"
                onClick={() => setShowTranslatePopup(false)}
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
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đang khởi tạo trình soạn thảo...</span>
          </div>
        </div>
      ) : (
        <ReactQuill
          key={dynamicFonts.map(f => f.name).join(',')}
          ref={editorRef}
          {...props}
          value={editorValue}
          onChange={handleOnChange}
          modules={customModules}
          formats={props.formats || FORMATS}
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

        .quill-wrapper-container[style*="--custom-line-height"] .ql-editor {
          line-height: var(--custom-line-height) !important;
        }
        @media (max-width: 767px) {
          .quill-wrapper-container[style*="--custom-line-height"] .ql-editor {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
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

        @media (max-width: 767px) {
          .quill-wrapper-container .ql-editor.title-bg-text *[style*="font-size"],
          .quill-wrapper-container .ql-editor.mobile-watermark-text *[style*="font-size"] {
            font-size: inherit !important;
          }

          /* General paragraph & span fallbacks when no custom inline size is set */
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-sub-text):not(.mobile-watermark-text):not(.title-bg-text) p:not(h1 p):not(h2 p):not(h3 p):not(.hero-phone-text *):not(.hero-slogan-text *):not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-sub-text):not(.mobile-watermark-text):not(.title-bg-text) span:not(h1 span):not(h2 span):not(h3 span):not(.hero-phone-text *):not(.hero-slogan-text *):not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container .ql-editor:not(.title-main-text):not(.title-sub-text):not(.mobile-watermark-text):not(.title-bg-text) *:not(h1):not(h1 *):not(h2):not(h2 *):not(h3):not(h3 *):not(h4):not(h4 *):not(.hero-phone-text *):not(.hero-slogan-text *):not([style*="--fs"]):not([style*="font-size"]) {
            font-size: 13px !important;
          }

          /* Fallback sizes for Hero Phone and Hero Slogan when no custom inline size is set */
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-phone-text:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-phone-text *:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-slogan-text:not([style*="--fs"]):not([style*="font-size"]),
          .quill-wrapper-container:not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) .ql-editor.hero-slogan-text *:not([style*="--fs"]):not([style*="font-size"]) {
            font-size: 11px !important;
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
            font-size: 18px !important;
            line-height: 1.2 !important;
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
            font-size: clamp(22px, 6.8vw, 28px) !important;
            line-height: 1.6 !important;
            display: block !important;
            margin-top: 5px !important;
            margin-bottom: 5px !important;
          }

          .quill-wrapper-container .ql-editor.title-main-text h1,
          .quill-wrapper-container .ql-editor.title-main-text h2,
          .quill-wrapper-container .ql-editor.title-main-text .ql-size-huge,
          .quill-wrapper-container .ql-editor.title-main-text .font-cursive,
          .quill-wrapper-container .ql-editor.title-main-text span {
            font-size: 36px !important;
            line-height: 1.1 !important;
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
            font-size: clamp(9px, 2.7vw, 14px) !important;
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
        .ql-snow .ql-color-picker.ql-expanded .ql-picker-options,
        .ql-snow .ql-background-picker.ql-expanded .ql-picker-options {
          width: 152px !important;
          padding: 8px !important;
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 3px !important;
          z-index: 100 !important;
        }
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
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"]:hover,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"]:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          border-color: #9ca3af !important;
        }
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"]::after,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"]::after {
          content: "Tự chọn màu" !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 10px !important;
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
          font-size: 1.05rem;
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
            max-width: calc(100vw - 68px) !important;
            padding: 24px 16px !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            max-width: calc(100vw - 140px) !important;
            padding: 24px 20px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        @media (min-width: 1024px) and (max-width: 1239px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            max-width: calc(100vw - 140px) !important;
            padding: 24px 20px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        @media (min-width: 1240px) and (max-width: 1439px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 60px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        @media (min-width: 1440px) {
          .quill-wrapper-container.is-blog-editor .ql-editor {
            padding: 24px 80px !important;
            box-shadow: 0 0 0 1px #e2e8f0, 0 4px 6px -1px rgba(0,0,0,0.05) !important;
          }
        }
        /* Giữ màu highlight selection khi editor mất focus tạm thời (click toolbar) */
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
        .quill-wrapper-container.is-blog-editor .ql-editor p {
          font-family: 'Montserrat', sans-serif;
          line-height: 1.6;
          color: #323232;
          margin: 0 0 0.5rem 0 !important;
          font-weight: 400;
          font-size: 1.05rem;
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
          font-size: 1.05rem !important;
        }
        .quill-wrapper-container.is-blog-editor .ql-editor strong {
          font-weight: 700 !important;
          color: #563c39 !important;
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

        /* Responsive mode (width <= 900px) */
        @container quill-container (max-width: 900px) {
          .ql-toolbar.ql-snow .ql-formats .ql-more {
            display: inline-block !important;
          }
          .ql-toolbar.ql-snow .ql-more-formats-group {
            position: relative !important;
            overflow: visible !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }
          
          /* Style dropdown panel as a floating select menu */
          .ql-toolbar.ql-snow .ql-more-dropdown {
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

          /* Show dropdown when expanded */
          .ql-toolbar.ql-snow.ql-toolbar-expanded .ql-more-dropdown {
            display: flex !important;
            animation: ql-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }

          /* Reset margins inside dropdown and lay out in a clean row with border dividers */
          .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats {
            margin-right: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            border-right: 1px solid #f1f5f9 !important;
            padding-right: 8px !important;
          }

          .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats:last-child {
            border-right: none !important;
            padding-right: 0 !important;
          }
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
          max-width: 100%;
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
        .ql-snow .ql-picker.ql-font .ql-picker-item {
          padding: 8px 12px !important;
          display: block !important;
          width: 100% !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="macdinh"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="macdinh"]::before { 
          content: 'Mặc định (Inter)' !important; 
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
        .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before { content: 'Mặc định' !important; }
        
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
        .quill-wrapper-container.is-blog-editor .ql-editor h1 { font-size: 1.8rem; }
        .quill-wrapper-container.is-blog-editor .ql-editor h2 { font-size: 2rem; }
        .quill-wrapper-container.is-blog-editor .ql-editor h3 { font-size: 1.5rem; }
        .quill-wrapper-container.is-blog-editor .ql-editor h4 { font-size: 1.5rem; }
        .quill-wrapper-container.is-blog-editor .ql-editor h5 { font-size: 1.25rem; }
        .quill-wrapper-container.is-blog-editor .ql-editor h6 { font-size: 1rem; }
        .resizer-handle {
          position: absolute;
          width: 24px;
          height: 24px;
          background: white;
          border: 2px solid #1A94FF;
          border-radius: 50%;
          pointer-events: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 2001;
          touch-action: none;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .resizer-handle:hover {
          transform: scale(1.1);
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
          margin-bottom: 36px !important;
        }
        .ql-editor img:not([data-caption])[title]:not([title=""]):not([title=" "]) {
          margin-bottom: 36px !important;
        }
        .editor-image-caption {
          position: absolute !important;
          text-align: center !important;
          font-size: 13px !important;
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
            font-size: 12px !important;
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
            font-size: 12px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-picker-label svg {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
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
            font-size: 13px !important;
          }
          
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-formats-group {
            position: relative !important;
            overflow: visible !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-dropdown {
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

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-expanded .ql-more-dropdown {
            display: flex !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-dropdown .ql-formats {
            margin-right: 0 !important;
            border-right: none !important;
            padding-right: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 2px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow.ql-toolbar-expanded button.ql-more {
            color: #1A94FF !important;
            background: #e6f7ff !important;
            border-radius: 4px !important;
          }

          .quill-wrapper-container .ql-toolbar.ql-snow {
            position: relative !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-formats-group {
            position: static !important;
          }
          .quill-wrapper-container .ql-toolbar.ql-snow .ql-more-dropdown {
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
          .quill-wrapper-container .ql-editor.title-bg-text,
          .quill-wrapper-container .ql-editor.mobile-watermark-text {
            font-size: clamp(60px, 19vw, 90px) !important;
          }
          .quill-wrapper-container .ql-editor.title-bg-text *,
          .quill-wrapper-container .ql-editor.mobile-watermark-text * {
            font-size: inherit !important;
          }
        }

        .ql-font-size-popup input::placeholder {
          color: #000000 !important;
          opacity: 1 !important;
        }
        .ql-font-size-popup input {
          color: #000000 !important;
        }
      `}} />

      {isMounted && resizerRect && createPortal((
        <div
          ref={resizerOverlayRef}
          className="fixed"
          style={{
            top: resizerRect.top,
            left: resizerRect.left,
            width: resizerRect.width,
            height: resizerRect.height,
            border: '2px solid #1A94FF',
            boxShadow: '0 0 10px rgba(26, 148, 255, 0.3)',
            pointerEvents: 'auto',
            zIndex: 10000,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Text Wrapping Toolbar */}
          <div className="wrap-toolbar" style={{ pointerEvents: 'auto' }} onMouseDown={(e) => e.stopPropagation()}>
            {!disableImageWrap && (
              <>
                <button
                  type="button"
                  className={`wrap-btn${imageWrapMode === 'left' ? ' active' : ''}`}
                  title="Chữ bao quanh - Trái"
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
                  title="Căn giữa - Không bao quanh"
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
                  title="Chữ bao quanh - Phải"
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
              title="Xóa hình ảnh"
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
            { dir: 'top-left', cursor: 'nwse-resize', style: { top: -12, left: -12 } },
            { dir: 'top-right', cursor: 'nesw-resize', style: { top: -12, right: -12 } },
            { dir: 'bottom-left', cursor: 'nesw-resize', style: { bottom: -12, left: -12 } },
            { dir: 'bottom-right', cursor: 'nwse-resize', style: { bottom: -12, right: -12 } }
          ].map((handle) => (
            <div
              key={handle.dir}
              data-dir={handle.dir}
              className="resizer-handle"
              style={{ ...handle.style, cursor: handle.cursor, pointerEvents: 'auto' }}
            />
          ))}
        </div>
      ), document.body)}

      {captions.map((cap, idx) => (
        <div
          key={idx}
          className="editor-image-caption"
          style={{
            top: cap.top + 6,
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
export default QuillWrapper;
