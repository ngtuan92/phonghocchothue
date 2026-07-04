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

    let processedHtml = preserveNbsp ? sanitized : sanitized.replace(/&nbsp;/g, " ");

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

    processedHtml = processedHtml.replace(/<img([^>]*?)\/?>\s*/gi, (match: string, attributes: string) => {
      const titleMatch = attributes.match(/title=["']([^"']*)["']/i);
      const captionMatch = attributes.match(/data-caption=["']([^"']*)["']/i);
      const wrapMatch = attributes.match(/data-wrap=["']([^"']*)["']/i);

      const hasDataCaption = /data-caption\s*=/i.test(attributes);
      const captionText = hasDataCaption
        ? (captionMatch?.[1] || "").trim()
        : (titleMatch?.[1] || "").trim();

      const wrapMode = wrapMatch?.[1] || '';
      const wrapClass = wrapMode === 'left' || wrapMode === 'right' ? ` image-wrap-${wrapMode}` : '';

      if (captionText) {
        const widthMatch = attributes.match(/width=["']([^"']*)["']/i);
        const styleMatch = attributes.match(/style=["']([^"']*)["']/i);

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
        return `<div class="image-wrapper${wrapClass}"${wrapperStyle}><img${attributes}><div class="image-caption">${captionText}</div></div>`;
      }
      return match;
    });

    processedHtml = processedHtml.replace(
      /<p[^>]*>\s*(<div class="image-wrapper(?: image-wrap-(?:left|right))?"[^>]*><img[^>]*>(?:<div class="image-caption">[\s\S]*?<\/div>)?<\/div>)\s*<\/p>/gi,
      '$2'
    );

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

    const isSimpleField = configKey === "describe-phone" || configKey === "describe-quote-text";
    if (isSimpleField) {
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

    return normalizeBlockHighlightHtml(processedHtml);
  }, [html, preserveNbsp, configKey]);

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
    return /^\d+(\.\d+)?$/.test(cleanValue) ? `${cleanValue}px` : cleanValue;
  };

  const customStyles = useMemo(() => {
    const viewportFontSize = isMobileViewport
      ? activeFontSizeMobile || activeFontSize
      : activeFontSize || activeFontSizeMobile;
    const styles: React.CSSProperties & Record<string, any> = {
      wordBreak: "normal",
      overflowWrap: "break-word",
      wordWrap: "break-word",
      whiteSpace: "normal",
      maxWidth: "100%",
      display: Component === "span" ? "inline" : "block",
    };
    if (activeLineHeight) {
      const normalized = normalizeLineHeight(activeLineHeight);
      if (normalized) styles['--custom-line-height' as any] = normalized;
    }
    if (activeLineHeightMobile) {
      const normalized = normalizeLineHeight(activeLineHeightMobile);
      if (normalized) styles['--custom-line-height-mobile' as any] = normalized;
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
      styles.fontSize = normalized;
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
  }, [Component, activeLineHeight, activeLineHeightMobile, activeFontSize, activeFontSizeMobile, activeTranslateY, activeTranslateYMobile, isMobileViewport]);

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

  if (!html) return fallback ? <Component className={`rich-text-renderer ${className}`} style={customStyles}>{fallback}</Component> : null;

  return (
    <>
      <Component
        className={`rich-text-renderer ${className}`}
        style={customStyles}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
        .rich-text-renderer img {
          display: block;
          margin-left: auto;
          margin-right: auto;
          max-width: 100%;
          height: auto;
        }
        @media (min-width: 768px) {
          .rich-text-renderer[style*="--fs-desktop"] *,
          .rich-text-renderer [style*="--fs-desktop"],
          .rich-text-renderer [style*="--fs-desktop"] *:not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) {
            font-size: var(--fs-desktop) !important;
          }
        }
        @media (max-width: 767px) {
          .rich-text-renderer[style*="--fs-mobile"] *,
          .rich-text-renderer [style*="--fs-mobile"],
          .rich-text-renderer [style*="--fs-mobile"] *:not([style*="font-size"]):not([style*="--fs-desktop"]):not([style*="--fs-mobile"]) {
            font-size: var(--fs-mobile) !important;
          }
        }
        .rich-text-renderer [style*="--custom-line-height"],
        .rich-text-renderer [style*="--custom-line-height"] * {
          line-height: var(--custom-line-height) !important;
        }
        .rich-text-renderer [style*="--translate-y"] {
          transform: translateY(var(--translate-y)) !important;
        }
        @media (max-width: 767px) {
          .rich-text-renderer [style*="--custom-line-height-mobile"],
          .rich-text-renderer [style*="--custom-line-height-mobile"] * {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .rich-text-renderer [style*="--translate-y-mobile"] {
            transform: translateY(var(--translate-y-mobile, var(--translate-y, 0px))) !important;
          }
        }
        /* Style for image wrappers */
        .rich-text-renderer .image-wrapper {
          margin-left: auto !important;
          margin-right: auto !important;
          display: block;
        }
        .rich-text-renderer .image-wrapper:not(.image-wrap-left):not(.image-wrap-right) {
          margin-top: 20px !important;
          margin-bottom: 16px !important;
        }
        .rich-text-renderer .image-wrapper img {
          width: 100% !important;
          display: block !important;
          margin: 0 !important;
        }
        /* Text wrapping: float left */
        .rich-text-renderer img[data-wrap="left"] {
          float: left !important;
          margin-right: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 12px !important;
          margin-left: 0 !important;
          display: inline !important;
        }
        /* Text wrapping: float right */
        .rich-text-renderer img[data-wrap="right"] {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 12px !important;
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
          margin-bottom: 16px !important;
          margin-top: 12px !important;
          display: inline-block !important;
          position: relative !important;
        }
        .rich-text-renderer .image-wrap-right {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 12px !important;
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
          line-height: 1.4 !important;
          padding: 0 4px !important;
          margin-top: 8px !important;
          margin-bottom: 4px !important;
          display: block !important;
        }
        /* Collapse the parent block or preceding empty block of a floated image/wrapper */
        .rich-text-renderer > *:not(.image-wrapper):not(.image-wrap-left):not(.image-wrap-right):empty {
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
            margin-top: 16px !important;
            margin-bottom: 0px !important;
          }
          .rich-text-renderer .image-wrapper.image-wrap-left,
          .rich-text-renderer .image-wrapper.image-wrap-right {
            float: none !important;
            display: block !important;
            width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 16px !important;
            margin-bottom: 24px !important;
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
            margin-bottom: 24px !important;
          }
          .rich-text-renderer .image-caption {
            display: block !important;
            position: static !important;
            clear: both !important;
            font-size: 11px !important;
            margin-top: 8px !important;
            margin-bottom: 18px !important;
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
            margin-bottom: 18px !important;
          }
          .rich-text-renderer .image-wrap-left img,
          .rich-text-renderer .image-wrap-right img {
            margin-bottom: 0 !important;
          }
        }
        
        .image-caption {
          text-align: center;
          color: #666;
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
      `}} />
    </>
  );
};

export default RichTextRenderer;
