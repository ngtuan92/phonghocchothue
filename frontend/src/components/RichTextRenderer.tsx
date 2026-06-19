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

interface RichTextRendererProps {
  html: string | null | undefined;
  configKey?: string;
  className?: string;
  fallback?: React.ReactNode;
  as?: React.ElementType;
  lineHeight?: string;
  lineHeightMobile?: string;
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

    processedHtml = processedHtml.replace(/<(p|h[1-6])([^>]*?)>\s*(<img[^>]*?>)\s*<\/\1>/gi, "$3");
    processedHtml = processedHtml.replace(/<(p|h[1-6])([^>]*?)>\s*(<iframe[^>]*?>.*?<\/iframe>)\s*<\/\1>/gi, "$3");

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

    return processedHtml;
  }, [html, preserveNbsp]);

  const contextLineHeight = useConfigContentByKey(configKey || "", "lineHeight");
  const contextLineHeightMobile = useConfigContentByKey(configKey || "", "lineHeightMobile");

  const activeLineHeight = lineHeight || contextLineHeight;
  const activeLineHeightMobile = lineHeightMobile || contextLineHeightMobile;

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
      styles['--custom-line-height' as any] = /^\d+$/.test(activeLineHeight.trim()) ? `${activeLineHeight.trim()}px` : activeLineHeight;
    }
    if (activeLineHeightMobile) {
      styles['--custom-line-height-mobile' as any] = /^\d+$/.test(activeLineHeightMobile.trim()) ? `${activeLineHeightMobile.trim()}px` : activeLineHeightMobile;
    }
    return styles;
  }, [Component, activeLineHeight, activeLineHeightMobile]);

  if (!html) return fallback ? <Component className={`rich-text-renderer ${className}`} style={customStyles}>{fallback}</Component> : null;

  return (
    <>
      <Component
        className={`rich-text-renderer ${className}`}
        style={customStyles}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
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
        }
        .rich-text-renderer .image-wrap-right {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 12px !important;
          display: inline-block !important;
        }
        .rich-text-renderer .image-wrap-left img,
        .rich-text-renderer .image-wrap-right img {
          display: block !important;
          float: none !important;
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
