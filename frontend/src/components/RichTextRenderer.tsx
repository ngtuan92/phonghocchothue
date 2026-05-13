"use client";

import React, { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

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
    
    const sanitized = DOMPurify.sanitize(html, {
      ADD_ATTR: ['style', 'width', 'height', 'target', 'rel'],
      ADD_TAGS: ['iframe'],
    });
    
    let processedHtml = sanitized.replace(/&nbsp;/g, " ");

    processedHtml = processedHtml.replace(/<img([^>]*?)\/?>/gi, (match, attributes) => {
      const titleMatch = attributes.match(/title=["']([^"']*)["']/i);
      const altMatch = attributes.match(/alt=["']([^"']*)["']/i);
      const captionText = (titleMatch?.[1] || altMatch?.[1] || "").trim();

      if (captionText) {
        return `<div class="image-wrapper"><img${attributes}><div class="image-caption">${captionText}</div></div>`;
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
      <style jsx global>{`
        .rich-text-renderer img {
          display: block;
          margin-left: auto;
          margin-right: auto;
          max-width: 100%;
          height: auto;
        }
        .image-caption {
          text-align: center;
          font-size: 14px;
          color: #666;
          margin-top: 8px;
          margin-bottom: 20px;
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

      `}</style>
    </>
  );
};

export default RichTextRenderer;
