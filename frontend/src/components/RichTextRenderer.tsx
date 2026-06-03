"use client";

import React, { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

interface RichTextRendererProps {
  html: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
  as?: React.ElementType;
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  html,
  className = "",
  fallback = null,
  as: Component = "div",
}) => {
  const cleanHtml = useMemo(() => {
    if (!html) return "";
    let sanitized = DOMPurify.sanitize(html);
    sanitized = sanitized.replace(/&nbsp;/g, " ");

    const processedHtml = sanitized.replace(/<img([^>]*?)\/?>/gi, (match, attributes) => {
      const titleMatch = attributes.match(/title=["']([^"']*)["']/i);
      const altMatch = attributes.match(/alt=["']([^"']*)["']/i);
      const captionText = (titleMatch?.[1] || altMatch?.[1] || "").trim();

      if (captionText) {
        return `<img${attributes}><div class="image-caption">${captionText}</div>`;
      }
      return match;
    });

    return processedHtml;
  }, [html]);

  if (!html) return fallback ? <Component className={className}>{fallback}</Component> : null;

  return (
    <>
      <Component
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
          color: #3b82f6; /* Màu xanh link */
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
