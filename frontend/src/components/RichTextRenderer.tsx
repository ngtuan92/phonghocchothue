"use client";

import React, { useEffect, useMemo, useState } from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";

const getDOMPurify = () => {
  if (typeof window !== "undefined") {
    const mod = require("isomorphic-dompurify");
    return mod.default || mod;
  }
  return null;
};

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/").replace(/\/$/, "") + "/";

const ABOUT_KEYS = [
  "describe-heading",
  "describe-bg-text",
  "describe-phone",
  "describe-quote-text",
  "seo-h1-main",
  "bgTitle",
  "describe-frame-image",
  "describe-frame-image-mobile",
  "textDecription"
];

const CONFIG_KEY_CLASS_NAMES: Record<string, string> = {
  "blog-heading": "describe-h2-wrapper blog-heading-rich",
  "faq-heading": "describe-h2-wrapper",
  "describe-h2": "describe-h2-wrapper",
  "room-heading": "describe-h2-wrapper",
  "amenities-content": "describe-h2-wrapper",
};

const splitBackgroundFromStyle = (styleContent: string) => {
  const kept: string[] = [];
  const background: string[] = [];

  styleContent.split(';').forEach((part) => {
    const clean = part.trim();
    if (!clean) return;
    if (/^background(?:-color)?:/i.test(clean)) {
      background.push(clean);
    } else {
      kept.push(clean);
    }
  });

  return {
    keptStyle: kept.join('; '),
    backgroundStyle: background.join('; '),
  };
};

const normalizeBlockHighlightHtml = (html: string) => {
  if (!html) return html;

  return html.replace(/<(p|h[1-6]|div)([^>]*)style=(["'])([^"']*background[^"']*)\3([^>]*)>([\s\S]*?)<\/\1>/gi, (
    match: string,
    tag: string,
    beforeStyle: string,
    quote: string,
    styleContent: string,
    afterStyle: string,
    innerHtml: string
  ) => {
    const { keptStyle, backgroundStyle } = splitBackgroundFromStyle(styleContent);
    if (!backgroundStyle) {
      return match;
    }

    const styleAttr = keptStyle ? ` style=${quote}${keptStyle}${quote}` : "";
    const attrs = `${beforeStyle || ""}${styleAttr}${afterStyle || ""}`;
    const normalizedInner = /<span[^>]*style=["'][^"']*background/i.test(innerHtml)
      ? innerHtml
      : `<span style="${backgroundStyle}">${innerHtml}</span>`;
    return `<${tag}${attrs}>${normalizedInner}</${tag}>`;
  });
};

const normalizeWhitespaceSpacers = (html: string) => {
  if (!html || typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  root?.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    if (block.querySelector('img, video, iframe, svg, canvas, table')) return;

    const text = (block.textContent || '').replace(/\u00a0/g, ' ');
    const hasOnlyWhitespaceText = text.length > 0 && text.trim() === '';
    const hasOnlyBreaks = !text && /^(?:\s|<br\s*\/?>|&nbsp;)*$/i.test(block.innerHTML || '');
    if (!hasOnlyWhitespaceText && !hasOnlyBreaks) return;

    block.classList.add('ql-whitespace-spacer');
    block.setAttribute('aria-hidden', 'true');
    block.textContent = hasOnlyWhitespaceText ? text : ' ';
  });

  return root?.innerHTML || html;
};

const normalizeNaturalTextWrapping = (html: string) => {
  if (!html || typeof DOMParser === "undefined") return html;

  const htmlWithSpacers = normalizeWhitespaceSpacers(html);
  const doc = new DOMParser().parseFromString(`<div>${htmlWithSpacers}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const parent = textNode.parentElement;
    if (!parent?.closest(".ql-whitespace-spacer")) {
      textNode.textContent = (textNode.textContent || "").replace(/\u00a0/g, " ");
    }
    textNode = walker.nextNode();
  }

  root.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    if (element.closest(".ql-whitespace-spacer")) return;
    element.style.removeProperty("white-space");
    element.style.removeProperty("overflow-wrap");
    element.style.removeProperty("word-break");
    if (!element.getAttribute("style")) element.removeAttribute("style");
  });

  return root.innerHTML;
};

const normalizeCustomLineHeightUnits = (html: string) => {
  if (!html) return html;

  return html.replace(/style=(["'])(.*?)\1/gi, (_match: string, quote: string, styleContent: string) => {
    const normalizedStyle = styleContent.replace(
      /(^|;)\s*(--custom-line-height(?:-mobile)?)\s*:\s*((?:\d+(?:\.\d+)?|\.\d+))\s*(?=;|$)/gi,
      (_styleMatch: string, prefix: string, property: string, value: string) =>
        `${prefix ? `${prefix} ` : ""}${property}: ${value}px`
    );

    return `style=${quote}${normalizedStyle}${quote}`;
  });
};

const hoistLineHeightToControlsBlock = (html: string) => {
  if (!html || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  let controlsRoot =
    root.children.length === 1 &&
    root.firstElementChild instanceof HTMLElement &&
    root.firstElementChild.matches("[data-rich-text-controls]")
      ? root.firstElementChild
      : null;
  const styledElements = Array.from(root.querySelectorAll<HTMLElement>("[style]"));
  let desktopLineHeight = "";
  let mobileLineHeight = "";

  styledElements.forEach((element) => {
    if (!desktopLineHeight) {
      desktopLineHeight =
        element.style.getPropertyValue("--custom-line-height").trim() ||
        element.style.getPropertyValue("line-height").trim();
    }
    if (!mobileLineHeight) {
      mobileLineHeight = element.style.getPropertyValue("--custom-line-height-mobile").trim();
    }
  });

  if (!desktopLineHeight && !mobileLineHeight) return html;

  if (!controlsRoot) {
    controlsRoot = doc.createElement("div");
    controlsRoot.setAttribute("data-rich-text-controls", "true");
    while (root.firstChild) controlsRoot.appendChild(root.firstChild);
    root.appendChild(controlsRoot);
  }

  controlsRoot.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    element.style.removeProperty("line-height");
    element.style.removeProperty("--custom-line-height");
    element.style.removeProperty("--custom-line-height-mobile");
    if (!element.getAttribute("style")) element.removeAttribute("style");
  });

  if (desktopLineHeight) {
    controlsRoot.style.setProperty("line-height", desktopLineHeight);
    controlsRoot.style.setProperty("--custom-line-height", desktopLineHeight);
  }
  if (mobileLineHeight) {
    controlsRoot.style.setProperty("--custom-line-height-mobile", mobileLineHeight);
  }

  return root.innerHTML;
};

interface RichTextRendererProps {
  html: string | null | undefined;
  configKey?: string;
  className?: string;
  fallback?: React.ReactNode;
  as?: React.ElementType;
  lineHeight?: string;
  lineHeightMobile?: string;
  fontSize?: string;
  fontSizeMobile?: string;
  translateY?: string;
  translateYMobile?: string;
  preserveNbsp?: boolean;
  naturalTextWrapping?: boolean;
  stripAllFontStyles?: boolean;
  blockLineHeight?: boolean;
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  html,
  configKey,
  className = "",
  fallback = null,
  as: Component = "div",
  lineHeight,
  lineHeightMobile,
  fontSize,
  fontSizeMobile,
  translateY,
  translateYMobile,
  preserveNbsp = false,
  naturalTextWrapping = false,
  stripAllFontStyles = false,
  blockLineHeight = false,
}) => {
  const cleanHtml = useMemo(() => {
    if (!html) return "";

    const domPurify = getDOMPurify();
    const sanitized = domPurify
      ? domPurify.sanitize(html, {
        ADD_ATTR: ['style', 'width', 'height', 'target', 'rel', 'data-border-radius', 'data-wrap', 'data-caption'],
        ADD_TAGS: ['iframe'],
      })
      : html;

    let processedHtml = naturalTextWrapping
      ? normalizeNaturalTextWrapping(sanitized)
      : preserveNbsp
        ? sanitized
        : sanitized.replace(/(?:&nbsp;|\u00a0)/gi, " ");

    processedHtml = processedHtml.replace(/<(p|h[1-6])([^>]*?)>\s*(<img[^>]*?>)(?:\s*|<br\s*\/?>|&nbsp;)*<\/\1>/gi, "$3");
    processedHtml = processedHtml.replace(/<(p|h[1-6])([^>]*?)>\s*(<iframe[^>]*?>.*?<\/iframe>)(?:\s*|<br\s*\/?>|&nbsp;)*<\/\1>/gi, "$3");

    processedHtml = processedHtml.replace(/<img([^>]*?)src=["']([^"']+?)["']/gi, (match: string, attributes: string, src: string) => {
      let resolvedSrc = src;
      if (resolvedSrc.includes("localhost:8080/")) {
        resolvedSrc = resolvedSrc.replace(/https?:\/\/localhost:8080\//gi, URL_API);
      } else if (resolvedSrc.startsWith("/")) {
        resolvedSrc = `${URL_API}${resolvedSrc.substring(1)}`;
      } else if (
        !resolvedSrc.startsWith("http://") &&
        !resolvedSrc.startsWith("https://") &&
        !resolvedSrc.startsWith("blob:") &&
        !resolvedSrc.startsWith("data:")
      ) {
        resolvedSrc = `${URL_API}${resolvedSrc}`;
      }
      return `<img${attributes}src="${resolvedSrc}"`;
    });

    // Process iframe src URLs
    processedHtml = processedHtml.replace(/<iframe([^>]*?)src=["']([^"']+?)["']/gi, (match: string, attributes: string, src: string) => {
      let resolvedSrc = src;
      if (resolvedSrc.includes("localhost:8080/")) {
        resolvedSrc = resolvedSrc.replace(/https?:\/\/localhost:8080\//gi, URL_API);
      } else if (resolvedSrc.startsWith("/")) {
        resolvedSrc = `${URL_API}${resolvedSrc.substring(1)}`;
      } else if (
        !resolvedSrc.startsWith("http://") &&
        !resolvedSrc.startsWith("https://") &&
        !resolvedSrc.startsWith("blob:") &&
        !resolvedSrc.startsWith("data:")
      ) {
        resolvedSrc = `${URL_API}${resolvedSrc}`;
      }
      return `<iframe${attributes}src="${resolvedSrc}"`;
    });

    // Add IDs to h2 and h3 elements for table of contents smooth scrolling
    let headingIndex = 0;
    processedHtml = processedHtml.replace(/<(h[23])([^>]*?)>(.*?)<\/\1>/gi, (match: string, tag: string, attributes: string, contentText: string) => {
      if (/id=["']/i.test(attributes)) return match;
      const id = `heading-${headingIndex++}`;
      return `<${tag} id="${id}"${attributes}>${contentText}</${tag}>`;
    });

    const preservedImageWrappers: string[] = [];
    processedHtml = processedHtml.replace(
      /<div\b[^>]*\bclass=["'][^"']*\bimage-wrapper\b[^"']*["'][^>]*>\s*<img\b[^>]*>\s*(?:<div\b[^>]*\bclass=["'][^"']*\bimage-caption\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*)?<\/div>/gi,
      (wrapperHtml: string) => {
        const token = `__PRESERVED_IMAGE_WRAPPER_${preservedImageWrappers.length}__`;
        preservedImageWrappers.push(wrapperHtml);
        return token;
      }
    );

    processedHtml = processedHtml.replace(/<img([^>]*?)\/?>\s*/gi, (match: string, attributes: string) => {
      // Clean "!important" from style width/height inside img tags to allow mobile responsive override
      let cleanAttrs = attributes.replace(/style=(["'])([^"']*?)\1/gi, (styleMatch: string, quote: string, styleContent: string) => {
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

      const wrapMode = wrapMatch?.[1] || '';
      const wrapClass = wrapMode === 'left' || wrapMode === 'right' ? ` image-wrap-${wrapMode}` : '';

      if (captionText) {
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
        return `<div class="image-wrapper${wrapClass}"${wrapperStyle}><img${cleanAttrs}><div class="image-caption">${captionText}</div></div>`;
      }
      return `<img${cleanAttrs}>`;
    });

    processedHtml = processedHtml.replace(
      /__PRESERVED_IMAGE_WRAPPER_(\d+)__/g,
      (match: string, index: string) => preservedImageWrappers[Number(index)] || match
    );

    processedHtml = processedHtml.replace(
      /<p[^>]*>\s*(<div class="image-wrapper(?: image-wrap-(?:left|right))?"[^>]*><img[^>]*>(?:<div class="image-caption">[\s\S]*?<\/div>)?<\/div>)\s*<\/p>/gi,
      '$1'
    );

    processedHtml = processedHtml.replace(/<span\b[^>]*class=["'][^"']*\bql-ui\b[^"']*["'][^>]*><\/span>/gi, "");

    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(`<div>${processedHtml}</div>`, 'text/html');
      const root = doc.body.firstElementChild;

      root?.querySelectorAll('.image-wrapper').forEach((wrapper) => {
        const img = wrapper.querySelector('img');
        const wrapperEl = wrapper instanceof HTMLElement ? wrapper : null;
        const imgEl = img instanceof HTMLElement ? img : null;
        const wrapMode = img?.getAttribute('data-wrap') || wrapper.getAttribute('data-wrap') || 'none';

        if (wrapperEl) {
          wrapperEl.setAttribute('data-wrap', wrapMode);
          wrapperEl.classList.remove('image-wrap-left', 'image-wrap-right');
          if (wrapMode === 'left' || wrapMode === 'right') {
            wrapperEl.classList.add(`image-wrap-${wrapMode}`);
          }
          wrapperEl.style.removeProperty('margin');
          wrapperEl.style.marginLeft = 'auto';
          wrapperEl.style.marginRight = 'auto';
        }

        if (wrapperEl && imgEl && !wrapperEl.style.width) {
          const imageWidth = imgEl.getAttribute('width') || imgEl.style.width || '';
          const normalizedWidth = /^\d+$/.test(imageWidth.trim()) ? `${imageWidth.trim()}px` : imageWidth.trim();

          if (normalizedWidth) {
            wrapperEl.style.width = normalizedWidth;
            wrapperEl.style.maxWidth = '100%';
          }
        }

        const captionText = (
          wrapper.querySelector(':scope > .image-caption')?.textContent
          || img?.getAttribute('data-caption')
          || ''
        ).replace(/\s+/g, ' ').trim();
        const next = wrapper.nextElementSibling;
        const nextText = (next?.textContent || '').replace(/\s+/g, ' ').trim();
        const nextHasMedia = !!next?.querySelector?.('img, video, iframe, svg, canvas');

        if (captionText && next && !nextHasMedia && nextText === captionText) {
          next.remove();
        }
      });

      if (root) processedHtml = root.innerHTML;
    }

    const cleanStyleForRender = (styleContent: string) => {
      const parts = styleContent.split(';');
      let otherStyles: string[] = [];

      for (let part of parts) {
        part = part.trim();
        if (!part) continue;

        const fsMatch = part.match(/^--fs:\s*(.+)$/i);
        if (fsMatch) {
          continue;
        }

        otherStyles.push(part);
      }

      return otherStyles.join('; ');
    };

    const stripFontSizeFromStyle = (styleContent: string) => {
      return styleContent
        .split(';')
        .map(part => part.trim())
        .filter(part => {
          if (!part) return false;
          const lower = part.toLowerCase();
          if (lower.startsWith('--fs-desktop') || lower.startsWith('--fs-mobile')) {
            return true;
          }
          return !lower.startsWith('font-size') && !lower.startsWith('--fs');
        })
        .join('; ');
    };

    const stripAllFontStylesFromStyle = (styleContent: string) => {
      return styleContent
        .split(';')
        .map(part => part.trim())
        .filter(part => {
          if (!part) return false;
          const lower = part.toLowerCase();
          return (
            !lower.startsWith('font-size') &&
            !lower.startsWith('line-height') &&
            !lower.startsWith('--fs') &&
            !lower.startsWith('--custom-line-height') &&
            !lower.startsWith('--translate-y')
          );
        })
        .join('; ');
    };

    const isSimpleField = configKey === "describe-phone" || configKey === "describe-quote-text";
    if (stripAllFontStyles) {
      processedHtml = processedHtml.replace(/style=(["'])([^"']*?)\1/gi, (match: string, quote: string, styleContent: string) => {
        const cleaned = stripAllFontStylesFromStyle(styleContent);
        return cleaned ? `style=${quote}${cleaned}${quote}` : "";
      });
    } else if (isSimpleField) {
      processedHtml = processedHtml.replace(/style=(["'])([^"']*?)\1/gi, (match: string, quote: string, styleContent: string) => {
        const cleaned = stripFontSizeFromStyle(styleContent);
        return cleaned ? `style=${quote}${cleaned}${quote}` : "";
      });
    } else {
      processedHtml = processedHtml.replace(/style=(["'])([^"']*?)\1/gi, (match: string, quote: string, styleContent: string) => {
        const cleaned = cleanStyleForRender(styleContent);
        return `style=${quote}${cleaned}${quote}`;
      });
    }

    const cleanBlockStyleString = (styleContent: string, tagName = '') => {
      return styleContent
        .split(';')
        .map(part => part.trim())
        .filter(part => {
          if (!part) return false;
          const lower = part.toLowerCase();
          if (tagName.toLowerCase() === 'li' && (lower.startsWith('--fs-desktop') || lower.startsWith('--fs-mobile'))) {
            return true;
          }
          return (
            !lower.startsWith('--fs-desktop') &&
            !lower.startsWith('--fs-mobile')
          );
        })
        .join('; ');
    };

    // Clean block styles
    processedHtml = processedHtml.replace(/<(p|li|h1|h2|h3|h4|h5|h6)\b([^>]*?)style=(["'])([^"']*?)\3([^>]*?)>/gi, (match: string, tag: string, before: string, quote: string, styleContent: string, after: string) => {
      const cleaned = cleanBlockStyleString(styleContent, tag);
      return cleaned
        ? `<${tag}${before}style=${quote}${cleaned}${quote}${after}>`
        : `<${tag}${before}${after}>`;
    });

    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(`<div>${processedHtml}</div>`, 'text/html');
      const root = doc.body.firstElementChild;

      root?.querySelectorAll('li').forEach((li) => {
        if (!(li instanceof HTMLElement)) return;

        const sizedElement = li.querySelector<HTMLElement>('[style*="font-size"], [style*="--fs-desktop"], [style*="--fs-mobile"]')
          || (li.matches('[style*="font-size"], [style*="--fs-desktop"], [style*="--fs-mobile"]') ? li : null);

        if (!sizedElement) return;

        const fontSize = sizedElement.style.getPropertyValue('font-size');
        const desktopFontSize = sizedElement.style.getPropertyValue('--fs-desktop');
        const mobileFontSize = sizedElement.style.getPropertyValue('--fs-mobile');

        if (fontSize && !li.style.getPropertyValue('font-size')) {
          li.style.setProperty('font-size', fontSize);
        }
        if (desktopFontSize && !li.style.getPropertyValue('--fs-desktop')) {
          li.style.setProperty('--fs-desktop', desktopFontSize);
        }
        if (mobileFontSize && !li.style.getPropertyValue('--fs-mobile')) {
          li.style.setProperty('--fs-mobile', mobileFontSize);
        }
      });

      if (root) processedHtml = root.innerHTML;
    }

    if (preserveNbsp) {
      processedHtml = normalizeWhitespaceSpacers(processedHtml);
    }

    processedHtml = normalizeBlockHighlightHtml(processedHtml);
    processedHtml = normalizeCustomLineHeightUnits(processedHtml);
    if (blockLineHeight) {
      processedHtml = hoistLineHeightToControlsBlock(processedHtml);
    }

    return processedHtml;
  }, [blockLineHeight, html, naturalTextWrapping, preserveNbsp, configKey, stripAllFontStyles]);

  const isAboutKey = configKey ? ABOUT_KEYS.includes(configKey) : false;

  const contextLineHeight = useConfigContentByKey(configKey || "", "lineHeight");
  const contextLineHeightMobile = useConfigContentByKey(configKey || "", "lineHeightMobile");
  const contextFontSize = useConfigContentByKey(configKey || "", "fontSize");
  const contextFontSizeMobile = useConfigContentByKey(configKey || "", "fontSizeMobile");
  const contextTranslateY = useConfigContentByKey(configKey || "", "translateY");
  const contextTranslateYMobile = useConfigContentByKey(configKey || "", "translateYMobile");

  const activeLineHeight = lineHeight || contextLineHeight;
  const activeLineHeightMobile = lineHeightMobile || contextLineHeightMobile;
  const activeFontSize = fontSize || contextFontSize;
  const activeFontSizeMobile = fontSizeMobile || contextFontSizeMobile;
  const activeTranslateY = translateY || contextTranslateY;
  const activeTranslateYMobile = translateYMobile || contextTranslateYMobile;
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const normalizeCssSize = (value: string) => {
    const cleanValue = String(value).trim();
    return /^-?\d+(\.\d+)?$/.test(cleanValue) ? `${cleanValue}px` : cleanValue;
  };

  const normalizeLineHeight = (value: string) => {
    const cleanValue = String(value).trim();
    if (cleanValue.startsWith("-")) return "";
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(cleanValue) ? `${cleanValue}px` : cleanValue;
  };

  const customStyles = useMemo(() => {
    const viewportFontSize = isMobileViewport
      ? activeFontSizeMobile || activeFontSize
      : activeFontSize || activeFontSizeMobile;
    const styles: React.CSSProperties & Record<string, any> = {
      wordBreak: "normal",
      overflowWrap: "break-word",
      wordWrap: "break-word",
      whiteSpace: preserveNbsp && !naturalTextWrapping ? "pre-wrap" : "normal",
      maxWidth: "100%",
      display: Component === "span" ? "inline" : "block",
    };
    if (stripAllFontStyles) {
      return styles;
    }
    if (activeLineHeight) {
      const normalized = normalizeLineHeight(activeLineHeight);
      if (normalized) {
        styles['--custom-line-height' as any] = normalized;
        styles.lineHeight = normalized;
      }
    }
    if (activeLineHeightMobile) {
      const normalized = normalizeLineHeight(activeLineHeightMobile);
      if (normalized) styles['--custom-line-height-mobile' as any] = normalized;
    }
    if (isMobileViewport && activeLineHeightMobile) {
      const normalized = normalizeLineHeight(activeLineHeightMobile);
      if (normalized) styles.lineHeight = normalized;
    }
    if (activeFontSize) {
      styles['--fs-desktop' as any] = normalizeCssSize(activeFontSize);
    }
    if (activeFontSizeMobile) {
      styles['--fs-mobile' as any] = normalizeCssSize(activeFontSizeMobile);
    }
    if (viewportFontSize) {
      const normalized = normalizeCssSize(viewportFontSize);
      styles['--fs' as any] = normalized;
    }
    if (activeTranslateY) {
      styles['--translate-y' as any] = normalizeCssSize(activeTranslateY);
    }
    if (activeTranslateYMobile) {
      if (!activeTranslateY) {
        styles['--translate-y' as any] = "0px";
      }
      styles['--translate-y-mobile' as any] = normalizeCssSize(activeTranslateYMobile);
    }
    return styles;
  }, [Component, activeLineHeight, activeLineHeightMobile, activeFontSize, activeFontSizeMobile, activeTranslateY, activeTranslateYMobile, isMobileViewport, naturalTextWrapping, preserveNbsp, stripAllFontStyles]);

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
    if (typeof document === "undefined") return;
    const styleId = "rich-text-renderer-styles";
    const styleEl = document.getElementById(styleId) || document.createElement("style");
    styleEl.id = styleId;
    styleEl.innerHTML = RICH_TEXT_RENDERER_STYLES;
    if (!styleEl.parentNode) {
      document.head.appendChild(styleEl);
    }
  }, []);

  const configClassName = configKey ? CONFIG_KEY_CLASS_NAMES[configKey] || "" : "";
  const rendererClassName = `rich-text-renderer ${configClassName} ${className}`.replace(/\s+/g, " ").trim();

  if (!html) return fallback ? <Component className={rendererClassName} style={customStyles}>{fallback}</Component> : null;

  return (
    <Component
      className={rendererClassName}
      style={customStyles}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

const RICH_TEXT_RENDERER_STYLES = `
        .rich-text-renderer img {
          display: block;
          margin-left: auto;
          margin-right: auto;
          max-width: 100%;
          height: auto;
        }
        .rich-text-renderer :is(span, strong, b, em, i, u)[style*="width"] {
          display: inline-block !important;
          max-width: 100% !important;
        }
        .rich-text-renderer h1,
        .rich-text-renderer h2,
        .rich-text-renderer h3 {
          clear: both !important;
        }
        .rich-text-renderer ul,
        .rich-text-renderer ol {
          padding-left: 1.5rem !important;
          margin: 0.5rem 0 !important;
        }
        .rich-text-renderer ul {
          list-style-type: disc !important;
        }
        .rich-text-renderer ol:not(:has(li[data-list])) {
          list-style-type: decimal !important;
        }
        .rich-text-renderer ol:has(li[data-list]) {
          list-style-type: decimal !important;
        }
        .rich-text-renderer li {
          display: list-item !important;
          line-height: inherit;
          list-style-position: outside !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        .rich-text-renderer li[data-list="bullet"] {
          list-style-type: disc !important;
        }
        .rich-text-renderer li[data-list="ordered"] {
          list-style-type: decimal !important;
        }
        .rich-text-renderer li::marker {
          color: currentColor;
          font-size: 1em;
          line-height: inherit;
        }
        .rich-text-renderer .ql-ui,
        .rich-text-renderer li::before {
          content: none !important;
          display: none !important;
        }
        .rich-text-renderer .ql-whitespace-spacer {
          display: block !important;
          min-height: 1em !important;
          line-height: inherit !important;
          margin: 0.75em 0 !important;
          white-space: pre-wrap !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        .rich-text-renderer .ql-whitespace-spacer * {
          white-space: inherit !important;
          overflow-wrap: inherit !important;
        }
        .rich-text-renderer .ql-align-center,
        .rich-text-renderer [style*="text-align: center"],
        .rich-text-renderer [style*="text-align:center"],
        .rich-text-renderer p:has([style*="font-family: alex-brush"]),
        .rich-text-renderer p:has([style*="font-family:alex-brush"]),
        .rich-text-renderer p:has([style*="font-family: 'alex-brush'"]),
        .rich-text-renderer p:has([style*="font-family: dancing-script"]),
        .rich-text-renderer p:has([style*="font-family:dancing-script"]),
        .rich-text-renderer p:has([style*="font-family: 'dancing-script'"]),
        .rich-text-renderer p:has([style*="font-family: pinyon-script"]),
        .rich-text-renderer p:has([style*="font-family:pinyon-script"]),
        .rich-text-renderer p:has([style*="font-family: 'pinyon-script'"]),
        .rich-text-renderer p:has([style*="font-family: caveat"]),
        .rich-text-renderer p:has([style*="font-family:caveat"]),
        .rich-text-renderer p:has([style*="font-family: 'caveat'"]),
        .rich-text-renderer p:has([style*="font-family: great-vibes"]),
        .rich-text-renderer p:has([style*="font-family:great-vibes"]),
        .rich-text-renderer p:has([style*="font-family: 'great-vibes'"]),
        .rich-text-renderer p:has([style*="font-family: satisfy"]),
        .rich-text-renderer p:has([style*="font-family:satisfy"]),
        .rich-text-renderer p:has([style*="font-family: 'satisfy'"]),
        .rich-text-renderer p:has([style*="font-family: pacifico"]),
        .rich-text-renderer p:has([style*="font-family:pacifico"]),
        .rich-text-renderer p:has([style*="font-family: 'pacifico'"]),
        .rich-text-renderer p:has([style*="font-family: parisienne"]),
        .rich-text-renderer p:has([style*="font-family:parisienne"]),
        .rich-text-renderer p:has([style*="font-family: 'parisienne'"]),
        .rich-text-renderer p:has([style*="font-family: tangerine"]),
        .rich-text-renderer p:has([style*="font-family:tangerine"]),
        .rich-text-renderer p:has([style*="font-family: 'tangerine'"]) {
          clear: both !important;
        }
        .rich-text-renderer > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h1,
        .rich-text-renderer > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h2,
        .rich-text-renderer > *:has(img[data-wrap="left"], img[data-wrap="right"]) + h3,
        .rich-text-renderer > img[data-wrap="left"] + h1,
        .rich-text-renderer > img[data-wrap="left"] + h2,
        .rich-text-renderer > img[data-wrap="left"] + h3,
        .rich-text-renderer > img[data-wrap="right"] + h1,
        .rich-text-renderer > img[data-wrap="right"] + h2,
        .rich-text-renderer > img[data-wrap="right"] + h3,
        .rich-text-renderer > .image-wrap-left + h1,
        .rich-text-renderer > .image-wrap-left + h2,
        .rich-text-renderer > .image-wrap-left + h3,
        .rich-text-renderer > .image-wrap-right + h1,
        .rich-text-renderer > .image-wrap-right + h2,
        .rich-text-renderer > .image-wrap-right + h3,
        .rich-text-renderer > .image-wrapper + h1,
        .rich-text-renderer > .image-wrapper + h2,
        .rich-text-renderer > .image-wrapper + h3 {
          clear: none !important;
        }
        @media (min-width: 768px) {
          .rich-text-renderer[style*="--fs-desktop"] *:not(.image-caption):not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .rich-text-renderer [style*="--fs-desktop"]:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .rich-text-renderer [style*="--fs-desktop"] *:not(.image-caption):not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]):not(:has([style*="--fs"])) {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .rich-text-renderer [style*="--color-mobile"] {
            color: var(--color-mobile) !important;
          }
          .rich-text-renderer[style*="--fs-mobile"] *:not(.image-caption):not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .rich-text-renderer [style*="--fs-mobile"]:not([style*="--fs"]):not([style*="font-size"]):not(:has([style*="--fs"])),
          .rich-text-renderer [style*="--fs-mobile"] *:not(.image-caption):not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]):not(:has([style*="--fs"])) {
            font-size: var(--fs-mobile) !important;
          }
        }
        @media (min-width: 768px) {
          .rich-text-renderer [style*="--fs-desktop"],
          .rich-text-renderer [style*="--fs-desktop"] *:not(.image-caption):not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) {
            font-size: var(--fs-desktop) !important;
          }
          .rich-text-renderer li[style*="--fs-desktop"]::marker {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .rich-text-renderer [style*="--fs-mobile"],
          .rich-text-renderer [style*="--fs-mobile"] *:not(.image-caption):not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) {
            font-size: var(--fs-mobile) !important;
          }
          .rich-text-renderer li[style*="--fs-mobile"]::marker {
            font-size: var(--fs-mobile) !important;
          }
        }
        .rich-text-renderer[style*="--fs-desktop"] .image-wrapper .image-caption,
        .rich-text-renderer[style*="--fs-mobile"] .image-wrapper .image-caption,
        .rich-text-renderer .image-wrapper .image-caption {
          font-size: inherit !important;
        }
        @media (min-width: 768px) {
          .rich-text-renderer [style*="--fs-desktop"] .image-caption,
          .rich-text-renderer .image-wrapper[style*="--fs-desktop"] .image-caption {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .rich-text-renderer [style*="--fs-mobile"] .image-caption,
          .rich-text-renderer .image-wrapper[style*="--fs-mobile"] .image-caption {
            font-size: var(--fs-mobile) !important;
          }
        }
        .rich-text-renderer [style*="--custom-line-height"],
        .rich-text-renderer [style*="--custom-line-height"] * {
          line-height: var(--custom-line-height) !important;
        }
        .rich-text-renderer[style*="--translate-y"],
        .rich-text-renderer [style*="--translate-y"] {
          transform: translateY(var(--translate-y)) !important;
        }
        .rich-text-renderer span[style*="--translate-y"] {
          display: inline-block !important;
        }
        .rich-text-renderer.inline-rich-text [style*="--translate-y"] {
          display: inline-block !important;
        }
        .rich-text-renderer.inline-rich-text[style*="--translate-y"] {
          position: relative !important;
          top: var(--translate-y) !important;
          transform: none !important;
        }
        @media (max-width: 767px) {
          .rich-text-renderer [style*="--custom-line-height-mobile"],
          .rich-text-renderer [style*="--custom-line-height-mobile"] * {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .rich-text-renderer[style*="--translate-y-mobile"],
          .rich-text-renderer [style*="--translate-y-mobile"] {
            transform: translateY(var(--translate-y-mobile, var(--translate-y, 0px))) !important;
          }
          .rich-text-renderer span[style*="--translate-y-mobile"] {
            display: inline-block !important;
          }
          .rich-text-renderer.inline-rich-text [style*="--translate-y-mobile"] {
            display: inline-block !important;
          }
          .rich-text-renderer.inline-rich-text[style*="--translate-y-mobile"] {
            position: relative !important;
            top: var(--translate-y-mobile, var(--translate-y, 0px)) !important;
            transform: none !important;
          }
        }
        /* Style for image wrappers */
        .rich-text-renderer .image-wrapper {
          margin-left: auto !important;
          margin-right: auto !important;
          display: block;
          max-width: 100% !important;
        }
        .rich-text-renderer .image-wrapper:not(.image-wrap-left):not(.image-wrap-right) {
          float: none !important;
          display: block !important;
          width: auto !important;
          max-width: 100% !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 20px !important;
          margin-bottom: 16px !important;
        }
        .rich-text-renderer .image-wrapper[data-wrap="none"] {
          float: none !important;
          display: block !important;
          width: auto !important;
          max-width: 100% !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .rich-text-renderer .image-wrapper img {
          max-width: 100% !important;
          display: block !important;
          margin: 0 !important;
        }
        .rich-text-renderer .image-wrapper[data-wrap="none"] img {
          margin-left: auto !important;
          margin-right: auto !important;
        }
        /* Text wrapping: float left */
        .rich-text-renderer img[data-wrap="left"] {
          float: left !important;
          margin-right: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 0 !important;
          margin-left: 0 !important;
          display: inline !important;
        }
        /* Text wrapping: float right */
        .rich-text-renderer img[data-wrap="right"] {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 0 !important;
          margin-right: 0 !important;
          display: inline !important;
        }
        /* Text wrapping: center/none */
        .rich-text-renderer img[data-wrap="none"] {
          float: none !important;
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 20px !important;
          margin-bottom: 10px !important;
        }
        /* Image wrapper wrapping support */
        .rich-text-renderer .image-wrap-left {
          float: left !important;
          margin-right: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 0 !important;
          display: inline-block !important;
          position: relative !important;
        }
        .rich-text-renderer .image-wrap-right {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 0 !important;
          display: inline-block !important;
          position: relative !important;
        }
        .rich-text-renderer .image-wrap-left img,
        .rich-text-renderer .image-wrap-right img {
          display: block !important;
          float: none !important;
          margin: 0 !important;
          margin-bottom: 0 !important;
        }
        /* Caption in floated wrappers: position static for natural document flow and no text overlap */
        .rich-text-renderer .image-wrap-left .image-caption,
        .rich-text-renderer .image-wrap-right .image-caption {
          position: static !important;
          text-align: center !important;
          color: #666666 !important;
          font-style: italic !important;
          font-size: inherit !important;
          line-height: 1.4 !important;
          padding: 0 4px !important;
          margin-top: 8px !important;
          margin-bottom: 4px !important;
          display: block !important;
        }
        /* Collapse the parent block or preceding empty block of a floated image/wrapper */
        .rich-text-renderer > p:empty,
        .rich-text-renderer > h1:empty,
        .rich-text-renderer > h2:empty,
        .rich-text-renderer > h3:empty,
        .rich-text-renderer > h4:empty,
        .rich-text-renderer > h5:empty,
        .rich-text-renderer > h6:empty,
        .rich-text-renderer > div:not(.image-wrapper):not(.image-wrap-left):not(.image-wrap-right):empty {
          margin: 0 !important;
          padding: 0 !important;
          height: 0 !important;
          min-height: 0 !important;
          line-height: 0 !important;
          border: none !important;
        }
        /* Reset margin-top of text block adjacent to floated images */
        .rich-text-renderer > *:not(.image-wrapper):not(.image-wrap-left):not(.image-wrap-right):has(img[data-wrap="left"], img[data-wrap="right"], .image-wrap-left, .image-wrap-right) + *,
        .rich-text-renderer > .image-wrap-left + *,
        .rich-text-renderer > .image-wrap-right + *,
        .rich-text-renderer > .image-wrapper + * {
          margin-top: 0 !important;
        }
        /* Clearfix for content after floated images */
        .rich-text-renderer::after {
          content: '' !important;
          display: table !important;
          clear: both !important;
        }
        
        /* Responsive Mobile styles to stack wrapped images nicely */
        @media (max-width: 767px) {
          .rich-text-renderer img[data-wrap="left"],
          .rich-text-renderer img[data-wrap="right"] {
            float: none !important;
            display: block !important;
            width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 6px !important;
            margin-bottom: 0px !important;
          }
          .rich-text-renderer .image-wrapper.image-wrap-left,
          .rich-text-renderer .image-wrapper.image-wrap-right {
            float: none !important;
            display: block !important;
            width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 6px !important;
            margin-bottom: 12px !important;
          }
          /* Ảnh không wrap: tự động mở rộng 100% chiều rộng container trên mobile */
          .rich-text-renderer img[data-wrap="none"],
          .rich-text-renderer img:not([data-wrap]) {
            width: 100% !important;
            height: auto !important;
            margin-bottom: 0px !important;
          }
          .rich-text-renderer .image-wrapper:not(.image-wrap-left):not(.image-wrap-right) {
            width: 100% !important;
            margin-top: 6px !important;
            margin-bottom: 12px !important;
          }
          .rich-text-renderer .image-caption {
            display: block !important;
            position: static !important;
            clear: both !important;
            font-size: inherit !important;
            margin-top: 8px !important;
            margin-bottom: 8px !important;
            padding: 0 8px !important;
            line-height: 1.45 !important;
            font-style: italic !important;
            text-align: center !important;
          }
          /* On mobile, reset caption back to static (no float, no absolute) */
          .rich-text-renderer .image-wrap-left .image-caption,
          .rich-text-renderer .image-wrap-right .image-caption {
            position: static !important;
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }
          .rich-text-renderer .image-wrap-left img,
          .rich-text-renderer .image-wrap-right img {
            margin-bottom: 0 !important;
          }
        }
        
        .image-caption {
          text-align: center;
          color: #666;
          font-size: inherit;
          margin-top: 12px;
          margin-bottom: 0;
          font-style: italic;
          line-height: 1.4;
          display: block;
          width: 100%;
        }
        .rich-text-renderer a {
          color: #3b82f6;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .rich-text-renderer a:hover {
          color: #2563eb;
          text-decoration: none;
        }
        .inline-rich-text,
        .inline-rich-text *,
        .inline-rich-text p,
        .inline-rich-text span,
        .inline-rich-text div {
          display: inline !important;
          width: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .inline-rich-text > p:first-child,
        .inline-rich-text > div:first-child {
          display: inline !important;
        }

        .rich-text-renderer[style*="--custom-line-height"] *,
        .rich-text-renderer[style*="--custom-line-height"] p,
        .rich-text-renderer[style*="--custom-line-height"] span,
        .rich-text-renderer[style*="--custom-line-height"] h1,
        .rich-text-renderer[style*="--custom-line-height"] h2,
        .rich-text-renderer[style*="--custom-line-height"] h3,
        .rich-text-renderer[style*="--custom-line-height"] h4,
        .rich-text-renderer[style*="--custom-line-height"] h5,
        .rich-text-renderer[style*="--custom-line-height"] h6 {
          line-height: var(--custom-line-height) !important;
        }

        @media (max-width: 767px) {
          .rich-text-renderer[style*="--custom-line-height-mobile"] *,
          .rich-text-renderer[style*="--custom-line-height-mobile"] p,
          .rich-text-renderer[style*="--custom-line-height-mobile"] span,
          .rich-text-renderer[style*="--custom-line-height-mobile"] h1,
          .rich-text-renderer[style*="--custom-line-height-mobile"] h2,
          .rich-text-renderer[style*="--custom-line-height-mobile"] h3,
          .rich-text-renderer[style*="--custom-line-height-mobile"] h4,
          .rich-text-renderer[style*="--custom-line-height-mobile"] h5,
          .rich-text-renderer[style*="--custom-line-height-mobile"] h6 {
            line-height: var(--custom-line-height-mobile) !important;
          }
        }
        /* Fix: title-main-text với Dancing Script - cần line-height 1.8 để cover dấu tiếng Việt */
        .rich-text-renderer.title-main-text,
        .rich-text-renderer.title-main-text h1,
        .rich-text-renderer.title-main-text h2,
        .rich-text-renderer.title-main-text p {
          overflow: visible !important;
        }
        .rich-text-renderer.title-main-text [style*="background:"],
        .rich-text-renderer.title-main-text [style*="background-color"],
        .rich-text-renderer.title-bg-text [style*="background:"],
        .rich-text-renderer.title-bg-text [style*="background-color"],
        .rich-text-renderer.mobile-watermark-text [style*="background:"],
        .rich-text-renderer.mobile-watermark-text [style*="background-color"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 1.24em !important;
          line-height: 1.12 !important;
          padding: 0.06em 0.06em 0.16em !important;
          vertical-align: middle !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        .rich-text-renderer.title-main-text p[style*="background:"],
        .rich-text-renderer.title-main-text p[style*="background-color"],
        .rich-text-renderer.title-bg-text p[style*="background:"],
        .rich-text-renderer.title-bg-text p[style*="background-color"],
        .rich-text-renderer.mobile-watermark-text p[style*="background:"],
        .rich-text-renderer.mobile-watermark-text p[style*="background-color"] {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: fit-content !important;
          min-height: 1.24em !important;
          line-height: 1.12 !important;
          padding: 0.06em 0.06em 0.16em !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .rich-text-renderer [style*="background:"],
        .rich-text-renderer [style*="background-color"] {
          display: inline !important;
          min-height: 0 !important;
          line-height: inherit !important;
          padding: 0.04em 0.03em 0.12em !important;
          vertical-align: baseline !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        .rich-text-renderer p[style*="background:"],
        .rich-text-renderer p[style*="background-color"],
        .rich-text-renderer h1[style*="background:"],
        .rich-text-renderer h1[style*="background-color"],
        .rich-text-renderer h2[style*="background:"],
        .rich-text-renderer h2[style*="background-color"],
        .rich-text-renderer div[style*="background:"],
        .rich-text-renderer div[style*="background-color"] {
          display: inline !important;
          width: auto !important;
          min-height: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .rich-text-renderer span[style*="background:"],
        .rich-text-renderer span[style*="background-color"],
        .rich-text-renderer strong[style*="background:"],
        .rich-text-renderer strong[style*="background-color"],
        .rich-text-renderer em[style*="background:"],
        .rich-text-renderer em[style*="background-color"] {
          display: inline !important;
          align-items: normal !important;
          justify-content: normal !important;
          width: auto !important;
          min-height: 0 !important;
          line-height: inherit !important;
          padding-top: 0.15em !important;
          padding-bottom: 0.15em !important;
          margin: 0 !important;
          vertical-align: baseline !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        /* H1/H2/H3 highlight spans: use flex to center text vertically like Word */
        .rich-text-renderer h1 span[style*="background:"],
        .rich-text-renderer h1 span[style*="background-color"],
        .rich-text-renderer h2 span[style*="background:"],
        .rich-text-renderer h2 span[style*="background-color"],
        .rich-text-renderer h3 span[style*="background:"],
        .rich-text-renderer h3 span[style*="background-color"] {
          display: inline-flex !important;
          align-items: center !important;
          vertical-align: middle !important;
          padding: 0.12em 0.05em !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        .rich-text-renderer.title-main-text span[style*="background"],
        .rich-text-renderer.title-bg-text span[style*="background"],
        .rich-text-renderer.mobile-watermark-text span[style*="background"],
        .rich-text-renderer.title-main-text strong[style*="background"],
        .rich-text-renderer.title-bg-text strong[style*="background"],
        .rich-text-renderer.mobile-watermark-text strong[style*="background"],
        .rich-text-renderer.title-main-text em[style*="background"],
        .rich-text-renderer.title-bg-text em[style*="background"],
        .rich-text-renderer.mobile-watermark-text em[style*="background"] {
          display: inline-block !important;
          align-items: normal !important;
          justify-content: normal !important;
          width: auto !important;
          min-height: 1.23em !important;
          line-height: 1.23 !important;
          padding: 0.035em 0.025em !important;
          margin: 0 !important;
          vertical-align: middle !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
        }
        .rich-text-renderer.blog-heading-rich,
        .rich-text-renderer.blog-heading-rich * {
          line-height: inherit !important;
          overflow: visible !important;
        }
        .rich-text-renderer.blog-heading-rich > p,
        .rich-text-renderer.blog-heading-rich > h1,
        .rich-text-renderer.blog-heading-rich > h2,
        .rich-text-renderer.blog-heading-rich > h3,
        .rich-text-renderer.blog-heading-rich > h4,
        .rich-text-renderer.blog-heading-rich > h5,
        .rich-text-renderer.blog-heading-rich > h6 {
          margin-top: 0 !important;
          margin-bottom: 2px !important;
          text-align: center !important;
        }
        .rich-text-renderer.blog-heading-rich > :last-child {
          margin-bottom: 0 !important;
        }
`;

export default RichTextRenderer;
