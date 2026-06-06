"use client";

import React, { useMemo } from "react";

const getDOMPurify = () => {
  if (typeof window !== "undefined") {
    const mod = require("isomorphic-dompurify");
    return mod.default || mod;
  }
  return null;
};

interface RichTextRendererProps {
  html: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  html,
  className = "",
  fallback = null,
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
    
    let processedHtml = sanitized.replace(/&nbsp;/g, " ");

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
  }, [html]);

  if (!html) return fallback ? <div className={`rich-text-renderer ${className}`}>{fallback}</div> : null;

  return (
    <>
      <div
        className={`rich-text-renderer ${className}`}
        style={{
          wordBreak: "normal",
          overflowWrap: "break-word",
          wordWrap: "break-word",
          whiteSpace: "normal",
          maxWidth: "100%",
          display: "block",
        }}
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
          margin-top: 11px !important;
          margin-left: 0 !important;
          display: inline !important;
        }
        /* Text wrapping: float right */
        .rich-text-renderer img[data-wrap="right"] {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 11px !important;
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
          margin-top: 11px !important;
          display: inline-block !important;
        }
        .rich-text-renderer .image-wrap-right {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 11px !important;
          display: inline-block !important;
        }
        .rich-text-renderer .image-wrap-left img,
        .rich-text-renderer .image-wrap-right img {
          display: block !important;
          float: none !important;
          margin: 0 !important;
        }
        /* Align top edge of text adjacent to floated images */
        .rich-text-renderer > *:has(img[data-wrap="left"], img[data-wrap="right"], .image-wrap-left, .image-wrap-right) {
          margin: 0 !important;
          padding: 0 !important;
          height: 0 !important;
          min-height: 0 !important;
          line-height: 0 !important;
          border: none !important;
        }
        .rich-text-renderer > *:has(img[data-wrap="left"], img[data-wrap="right"], .image-wrap-left, .image-wrap-right) + * {
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
          .rich-text-renderer img[data-wrap="right"],
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
          .rich-text-renderer img[data-wrap="none"] {
            margin-bottom: 10px !important;
          }
          .rich-text-renderer .image-wrapper:not(.image-wrap-left):not(.image-wrap-right) {
            margin-bottom: 10px !important;
          }
          .rich-text-renderer .image-caption {
            font-size: 12px !important;
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
        .inline-rich-text p {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          color: inherit !important;
        }
      `}} />
    </>
  );
};

export default RichTextRenderer;
