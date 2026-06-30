"use client";

import React, { useMemo } from "react";
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
    const cleanStyleForRender = (styleContent: string) => {
      const parts = styleContent.split(';');
      let activeSize = null;
      let otherStyles: string[] = [];

      for (let part of parts) {
        part = part.trim();
        if (!part) continue;

        const fsMatch = part.match(/^--fs:\s*(.+)$/i);
        if (fsMatch) {
          activeSize = fsMatch[1].trim();
          continue;
        }

        const fontSizeMatch = part.match(/^font-size:\s*(.+)$/i);
        if (fontSizeMatch) {
          const val = fontSizeMatch[1].trim();
          if (val.toLowerCase() !== 'var(--fs)') {
            activeSize = val;
          }
          continue;
        }

        otherStyles.push(part);
      }

      if (activeSize) {
        const othersStr = otherStyles.length > 0 ? `; ${otherStyles.join('; ')}` : '';
        return `font-size: ${activeSize}${othersStr}`;
      } else {
        return otherStyles.join('; ');
      }
    };

    const stripFontSizeFromStyle = (styleContent: string) => {
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

    return processedHtml;
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

  const normalizeCssSize = (value: string) => {
    const cleanValue = String(value).trim();
    return /^-?\d+(\.\d+)?$/.test(cleanValue) ? `${cleanValue}px` : cleanValue;
  };

  const customStyles = useMemo(() => {
    const styles: React.CSSProperties & Record<string, any> = {
      wordBreak: "normal",
      overflowWrap: "break-word",
      wordWrap: "break-word",
      whiteSpace: "normal",
      maxWidth: "100%",
      display: Component === "span" ? "inline" : "block",
    };
    if (activeLineHeight) {
      styles['--custom-line-height' as any] = normalizeCssSize(activeLineHeight);
    }
    if (activeLineHeightMobile) {
      styles['--custom-line-height-mobile' as any] = normalizeCssSize(activeLineHeightMobile);
    }
    if (activeFontSize) {
      styles['--fs-desktop' as any] = normalizeCssSize(activeFontSize);
    }
    if (activeFontSizeMobile) {
      styles['--fs-mobile' as any] = normalizeCssSize(activeFontSizeMobile);
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
  }, [Component, activeLineHeight, activeLineHeightMobile, activeFontSize, activeFontSizeMobile, activeTranslateY, activeTranslateYMobile]);

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
          margin-bottom: 36px !important;
        }
        /* Caption in floated wrappers: position absolute to match admin editor */
        .rich-text-renderer .image-wrap-left .image-caption,
        .rich-text-renderer .image-wrap-right .image-caption {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          text-align: center !important;
          font-size: 13px !important;
          color: #666666 !important;
          font-style: italic !important;
          line-height: 1.4 !important;
          padding: 0 4px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          margin: 0 !important;
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
        
        /* Force headings to clear floats so they start below floated images/captions */
        .rich-text-renderer h1,
        .rich-text-renderer h2 {
          clear: both !important;
        }
        .rich-text-renderer .image-wrap-left + h1,
        .rich-text-renderer .image-wrap-left + h2,
        .rich-text-renderer .image-wrap-right + h1,
        .rich-text-renderer .image-wrap-right + h2 {
          clear: none !important;
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
            margin-bottom: 16px !important;
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
            margin-bottom: 10px !important;
          }
          .rich-text-renderer .image-caption {
            font-size: 12px !important;
            margin-top: 4px !important;
            margin-bottom: 10px !important;
          }
          /* On mobile, reset caption back to static (no float, no absolute) */
          .rich-text-renderer .image-wrap-left .image-caption,
          .rich-text-renderer .image-wrap-right .image-caption {
            position: static !important;
            font-size: 12px !important;
            margin-top: 4px !important;
            margin-bottom: 10px !important;
          }
          .rich-text-renderer .image-wrap-left img,
          .rich-text-renderer .image-wrap-right img {
            margin-bottom: 0 !important;
          }
        }
        
        .image-caption {
          text-align: center;
          font-size: 14px;
          color: #666;
          margin-top: 8px;
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
      `}} />
    </>
  );
};

export default RichTextRenderer;
