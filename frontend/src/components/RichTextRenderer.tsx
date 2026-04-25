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
    const sanitized = DOMPurify.sanitize(html);
    return sanitized.replace(/&nbsp;/g, " ");
  }, [html]);

  if (!html) return fallback ? <div className={className}>{fallback}</div> : null;

  return (
    <div
      className={`rich-text-renderer ${className}`}
      style={{
        wordBreak: 'normal',
        overflowWrap: 'break-word',
        wordWrap: 'break-word',
        whiteSpace: 'normal',
        maxWidth: '100%',
        display: 'block'
      }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default RichTextRenderer;
