"use client";

import React, { useState, useMemo } from "react";
import { FaList, FaChevronDown, FaChevronUp } from "react-icons/fa";

interface TableOfContentsProps {
  html: string | null | undefined;
}

interface TOCItem {
  text: string;
  level: number;
  id: string;
  displayName: string;
  isSub: boolean;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ html }) => {
  const [isOpen, setIsOpen] = useState(false);

  const items = useMemo<TOCItem[]>(() => {
    if (!html) return [];

    const headingRegex = /<(h[23])[^>]*>(.*?)<\/h[23]>/gi;
    const headings: { text: string; level: number }[] = [];
    let match;

    const decodeHtmlEntities = (str: string) => {
      const entities: { [key: string]: string } = {
        "&quot;": '"',
        "&amp;": "&",
        "&apos;": "'",
        "&lt;": "<",
        "&gt;": ">",
        "&#39;": "'",
        "&nbsp;": " ",
        "&rsquo;": "'",
        "&lsquo;": "'",
        "&ldquo;": '"',
        "&rdquo;": '"',
        "&ndash;": "-",
        "&mdash;": "—",
      };
      return str.replace(/&[#a-zA-Z0-9]+;/g, (m) => entities[m] || m);
    };

    const stripHtml = (text: string) => {
      const stripped = text.replace(/<[^>]*>/g, "");
      return decodeHtmlEntities(stripped).trim();
    };

    while ((match = headingRegex.exec(html)) !== null) {
      const level = match[1].toLowerCase() === "h2" ? 2 : 3;
      const text = stripHtml(match[2]);
      headings.push({ text, level });
    }

    let h2Counter = 0;
    let index = 0;
    
    // Check if the text already starts with numbering (e.g., "1.", "1 ", "1.1")
    const startsWithNumbering = /^\s*\d+[\.\s\-]/;

    return headings
      .map((h) => {
        const id = `heading-${index++}`;
        if (!h.text) return null;
        
        if (h.level === 2) {
          const hasNumbering = startsWithNumbering.test(h.text);
          let displayName = h.text;
          
          if (!hasNumbering) {
            h2Counter++;
            displayName = `${h2Counter}. ${h.text}`;
          } else {
            h2Counter++;
          }

          return {
            text: h.text,
            level: h.level,
            id,
            displayName,
            isSub: false,
          };
        } else {
          return {
            text: h.text,
            level: h.level,
            id,
            displayName: h.text,
            isSub: true,
          };
        }
      })
      .filter((item): item is TOCItem => item !== null);
  }, [html]);

  const handleScrollToHeading = (id: string) => {
    if (typeof document === "undefined") return;
    const target = document.getElementById(id);
    const container = document.getElementById("blog-detail-scroll-container");
    if (target) {
      const headerOffset = 100; // Offset from top of card container
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTarget =
          targetRect.top - containerRect.top + container.scrollTop - headerOffset;

        container.scrollTo({
          top: scrollTarget,
          behavior: "smooth",
        });
      } else {
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-[#f8f9fa] border border-[#799f851a] rounded-xl p-3 mb-4 shadow-sm transition-all duration-300">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <span className="text-[#563c39] font-bold text-sm sm:text-base raleway">
          Nội dung bài viết
        </span>
        <button
          aria-label="Toggle table of contents"
          type="button"
          className="border border-gray-200 bg-white rounded-lg p-1.5 flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FaList size={12} className="text-[#563c39]" />
          {isOpen ? (
            <FaChevronUp size={9} className="text-gray-400" />
          ) : (
            <FaChevronDown size={9} className="text-gray-400" />
          )}
        </button>
      </div>

      {/* Content list */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                handleScrollToHeading(item.id);
              }}
              className={`cursor-pointer transition-colors duration-200 ${
                item.isSub
                  ? "pl-5 sm:pl-7 text-[13px] sm:text-[14px] text-gray-600 hover:text-[#e57f7f]"
                  : "text-[14px] sm:text-base text-[#563c39] font-medium hover:text-[#e57f7f]"
              }`}
            >
              {item.displayName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableOfContents;
