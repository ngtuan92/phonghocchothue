"use client";

import React, { useEffect, useMemo, useState } from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import {
  normalizeExcessiveLeadingWhitespaceAlignment,
  normalizeResponsiveLineHeightStyles,
} from "@/utils/richTextControls";
import { normalizeVietnameseHtml } from "@/utils/vietnameseNormalizer";

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

const unwrapLeadingWhitespaceMarkers = (html: string) => {
  if (!html) return html;
  return html
    .replace(/<span\b[^>]*\bclass=["'][^"']*\bql-leading-whitespace\b[^"']*["'][^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/<span\b[^>]*\bclass=["'][^"']*\bql-cursor\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/\uFEFF/g, '');
};

const normalizeNaturalTextWrapping = (html: string, keepLeadingWhitespace = false) => {
  if (!html || typeof DOMParser === "undefined") return html;

  const htmlWithSpacers = normalizeWhitespaceSpacers(html);
  const doc = new DOMParser().parseFromString(`<div>${htmlWithSpacers}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    if (element.closest(".ql-whitespace-spacer, .ql-whitespace-preserve")) return;
    element.style.removeProperty("white-space");
    element.style.removeProperty("overflow-wrap");
    element.style.removeProperty("word-break");
    if (!element.getAttribute("style")) element.removeAttribute("style");
  });

  return keepLeadingWhitespace ? unwrapLeadingWhitespaceMarkers(root.innerHTML) : root.innerHTML;
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

const normalizeWordSeparators = (html: string) => {
  if (!html) return html;

  // 1. Protect intentional runs of 2+ spaces / non-breaking spaces (indentation / multi-spacing)
  const multiSpaceTokens: string[] = [];
  let tokenized = html.replace(/(?:&nbsp;|\u00a0| ){2,}/g, (match: string) => {
    const token = `___MULTI_NBSP_${multiSpaceTokens.length}___`;
    multiSpaceTokens.push(match.replace(/ /g, '\u00a0'));
    return token;
  });

  // 2. Protect standalone spacer blocks (<p ...>&nbsp;</p> or <div ...>&nbsp;</div> or blocks with only whitespace/breaks)
  const spacerTokens: string[] = [];
  tokenized = tokenized.replace(/(<(p|div|h[1-6]|li)\b[^>]*>)\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*\s*(<\/\2>)/gi, (match: string) => {
    const token = `___SPACER_BLOCK_${spacerTokens.length}___`;
    spacerTokens.push(match);
    return token;
  });

  // 3. Normalize single &nbsp; / \u00a0 inside empty inline tags between formatted words:
  // e.g. <em ...>&nbsp;</em> -> ' '
  tokenized = tokenized.replace(/(<(span|strong|em|b|i|u|small|font)\b[^>]*>)\s*(?:&nbsp;|\u00a0)\s*(<\/\2>)/gi, ' ');

  // 4. Convert all remaining isolated single &nbsp; or \u00a0 to normal breakable space ' '
  // so words never get glued into long unbreakable compound phrases on mobile
  tokenized = tokenized.replace(/&nbsp;|\u00a0/g, ' ');

  // 5. Restore spacer blocks
  tokenized = tokenized.replace(/___SPACER_BLOCK_(\d+)___/g, (_match: string, index: string) => spacerTokens[Number(index)] || '');

  // 6. Restore intentional multi-space runs
  tokenized = tokenized.replace(/___MULTI_NBSP_(\d+)___/g, (_match: string, index: string) => multiSpaceTokens[Number(index)] || ' ');

  return tokenized;
};

const preserveSignificantInlineWhitespace = (html: string) => {
  if (!html) return html;
  return html.replace(/(>|^)([^<]+)(<|$)/g, (_match: string, prefix: string, text: string, suffix: string) => {
    // Only convert runs of 2+ spaces to \u00a0 to preserve intentional multi-spacing.
    // NEVER convert single boundary spaces (^ + or +$) to \u00a0, which glues adjacent formatted words together!
    const converted = text.replace(/ {2,}/g, (spaces: string) => "\u00a0".repeat(spaces.length));
    return prefix + converted + suffix;
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
  translateX?: string;
  translateXMobile?: string;
  translateY?: string;
  translateYMobile?: string;
  preserveNbsp?: boolean;
  normalizeNbsp?: boolean;
  preserveLeadingIndent?: boolean;
  resetLeadingIndentOnMobile?: boolean;
  naturalTextWrapping?: boolean;
  stripAllFontStyles?: boolean;
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
  translateX,
  translateXMobile,
  translateY,
  translateYMobile,
  preserveNbsp = false,
  normalizeNbsp = false,
  preserveLeadingIndent = false,
  resetLeadingIndentOnMobile = false,
  naturalTextWrapping = false,
  stripAllFontStyles = false,
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

    let processedHtml = unwrapLeadingWhitespaceMarkers(sanitized);

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

      const wrapMode = wrapMatch?.[1] || 'none';
      const wrapClass = wrapMode === 'left' || wrapMode === 'right' ? ` image-wrap-${wrapMode}` : '';

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
      const captionHtml = captionText ? `<div class="image-caption">${captionText}</div>` : '';
      return `<div class="image-wrapper${wrapClass}" data-wrap="${wrapMode}"${wrapperStyle}><img${cleanAttrs}>${captionHtml}</div>`;
    });

    processedHtml = processedHtml.replace(
      /__PRESERVED_IMAGE_WRAPPER_(\d+)__/g,
      (match: string, index: string) => preservedImageWrappers[Number(index)] || match
    );

    processedHtml = processedHtml.replace(
      /<p[^>]*>\s*(<div\b[^>]*\bclass=["'][^"']*\bimage-wrapper\b[^"']*["'][^>]*>[\s\S]*?<\/div>)\s*<\/p>/gi,
      '$1'
    );

    processedHtml = processedHtml.replace(/<span\b[^>]*class=["'][^"']*\bql-ui\b[^"']*["'][^>]*><\/span>/gi, "");

    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(`<div>${processedHtml}</div>`, 'text/html');
      const root = doc.body.firstElementChild;

      // Clean phantom empty paragraphs from HTML parser artifacts
      root?.querySelectorAll('p').forEach((p) => {
        if (!p.children.length && !p.textContent?.trim() && !p.classList.contains('ql-whitespace-preserve') && !p.classList.contains('ql-whitespace-spacer')) {
          p.remove();
        }
      });

      // Normalize ALL images to have .image-wrapper and proper wrap attributes
      root?.querySelectorAll('img').forEach((img) => {
        let wrapper = img.closest('.image-wrapper');
        const wrapMode = img.getAttribute('data-wrap') || wrapper?.getAttribute('data-wrap') || 'none';
        const caption = (
          img.getAttribute('data-caption')
          || img.getAttribute('title')
          || wrapper?.querySelector(':scope > .image-caption')?.textContent
          || ''
        ).replace(/\s+/g, ' ').trim();

        if (!wrapper) {
          wrapper = doc.createElement('div');
          wrapper.className = 'image-wrapper';
          const parentP = img.parentElement?.tagName === 'P' && img.parentElement.children.length === 1 && !img.parentElement.textContent?.trim()
            ? img.parentElement
            : null;
          const target = parentP || img;
          target.replaceWith(wrapper);
          wrapper.appendChild(img);
        }

        const wrapperEl = (typeof HTMLElement !== 'undefined' && wrapper instanceof HTMLElement) ? wrapper : (wrapper as any);
        const imgEl = (typeof HTMLElement !== 'undefined' && img instanceof HTMLElement) ? img : (img as any);

        const cleanImageInlineStyle = (styleStr: string | null) => {
          if (!styleStr) return '';
          return styleStr
            .split(';')
            .map((part) => part.trim())
            .filter((part) => {
              if (!part) return false;
              const lower = part.toLowerCase();
              if (
                lower.startsWith('float:') ||
                lower.startsWith('clear:') ||
                lower.startsWith('display:') ||
                lower.startsWith('margin:') ||
                lower.startsWith('margin-left:') ||
                lower.startsWith('margin-right:') ||
                lower.startsWith('margin-top:') ||
                lower.startsWith('margin-bottom:')
              ) {
                return false;
              }
              return true;
            })
            .map((part) => {
              if (/^(?:max-|min-)?(?:width|height)\s*:/i.test(part)) {
                return part.replace(/\s*!important/gi, '').trim();
              }
              return part;
            })
            .join('; ');
        };

        if (wrapperEl) {
          wrapperEl.setAttribute('data-wrap', wrapMode);
          wrapperEl.classList.remove('image-wrap-left', 'image-wrap-right');
          if (wrapMode === 'left' || wrapMode === 'right') {
            wrapperEl.classList.add(`image-wrap-${wrapMode}`);
          }

          const currentWrapperStyle = wrapperEl.getAttribute('style');
          const cleanedWrapperStyle = cleanImageInlineStyle(currentWrapperStyle);
          if (cleanedWrapperStyle) {
            wrapperEl.setAttribute('style', cleanedWrapperStyle);
          } else {
            wrapperEl.removeAttribute('style');
          }

          if (imgEl) {
            const currentImgStyle = imgEl.getAttribute('style');
            const cleanedImgStyle = cleanImageInlineStyle(currentImgStyle);
            if (cleanedImgStyle) {
              imgEl.setAttribute('style', cleanedImgStyle);
            } else {
              imgEl.removeAttribute('style');
            }
          }

          const finalWrapperStyle = wrapperEl.getAttribute('style') || '';
          if (!/width\s*:/i.test(finalWrapperStyle)) {
            const imageWidth = (imgEl && (imgEl.getAttribute('width') || imgEl.style?.width)) || '';
            const normalizedWidth = /^\d+$/.test(String(imageWidth).trim()) ? `${String(imageWidth).trim()}px` : String(imageWidth).trim();
            if (normalizedWidth) {
              wrapperEl.setAttribute(
                'style',
                finalWrapperStyle
                  ? `${finalWrapperStyle}; width: ${normalizedWidth}; max-width: 100%;`
                  : `width: ${normalizedWidth}; max-width: 100%;`
              );
            }
          }
        }

        if (caption && !wrapper.querySelector(':scope > .image-caption')) {
          const capDiv = doc.createElement('div');
          capDiv.className = 'image-caption';
          capDiv.textContent = caption;
          wrapper.appendChild(capDiv);
        }

        const next = wrapper.nextElementSibling;
        const nextText = (next?.textContent || '').replace(/\s+/g, ' ').trim();
        const nextHasMedia = !!next?.querySelector?.('img, video, iframe, svg, canvas');

        if (caption && next && !nextHasMedia && nextText === caption) {
          next.remove();
        }
      });

      const isWhitespaceSpacerBlock = (el: Element | null): boolean => {
        if (!el) return false;
        if (el.querySelector('img, video, iframe, svg, canvas, table, audio')) return false;
        const text = (el.textContent || '').replace(/[\u00a0\s]/g, '');
        if (text !== '') return false;
        const html = el.innerHTML || '';
        return /^(?:\s|<br\s*\/?>|&nbsp;|\u00a0)*$/i.test(html) || el.classList.contains('ql-whitespace-preserve');
      };

      root?.querySelectorAll('.ql-whitespace-preserve').forEach((el) => {
        const text = (el.textContent || '').replace(/[\u00a0\s]/g, '');
        if (text !== '') {
          el.classList.remove('ql-whitespace-preserve');
        }
      });

      // Group wrap-left / wrap-right images with their following text siblings
      // so on mobile we can display text first (order: 1), and image second (order: 2),
      // while on desktop display: contents preserves 100% native float wrapping!
      const wrapWrappers = Array.from(
        root?.querySelectorAll('.image-wrapper.image-wrap-left, .image-wrapper.image-wrap-right') || []
      );

      wrapWrappers.forEach((wrapper) => {
        if (wrapper.parentElement?.classList.contains('rich-text-wrap-group')) return;

        const isWrapLeft = wrapper.classList.contains('image-wrap-left');
        const wrapMode = isWrapLeft ? 'left' : 'right';
        const parent = wrapper.parentNode;
        if (!parent) return;

        // 1. Collect leading spacer blocks directly between image and wrapped text
        const leadingSpacers: Element[] = [];
        let curr = wrapper.nextElementSibling;
        while (curr && isWhitespaceSpacerBlock(curr)) {
          leadingSpacers.push(curr);
          curr = curr.nextElementSibling;
        }

        // All leading spacers between image and wrapped text are preserved on desktop
        // so intentional top spacing (Enter) is rendered beside the image.
        // They are marked with wrap-spacer-mobile-hide so on mobile they are hidden.
        const intentionalLeadingSpacers: Element[] = [];
        for (let i = 0; i < leadingSpacers.length; i++) {
          leadingSpacers[i].classList.add('ql-whitespace-preserve', 'wrap-spacer-mobile-hide');
          if (!leadingSpacers[i].innerHTML || leadingSpacers[i].innerHTML.trim() === '') {
            leadingSpacers[i].innerHTML = '&nbsp;';
          }
          intentionalLeadingSpacers.push(leadingSpacers[i]);
        }

        // 2. Collect ALL consecutive content blocks belonging to this wrap section.
        // Stop when hitting an empty spacer (author hit Enter to end the wrap section),
        // another image, a heading, or a divider.
        const textSiblings: Element[] = [...intentionalLeadingSpacers];
        while (
          curr &&
          !isWhitespaceSpacerBlock(curr) &&
          !curr.classList.contains('image-wrapper') &&
          !curr.classList.contains('rich-text-wrap-group') &&
          !curr.querySelector('.image-wrapper, img, video, iframe, table') &&
          !/^(HR|H1|H2|H3|H4|H5|H6|TABLE|FIGURE|IFRAME)$/i.test(curr.tagName)
        ) {
          textSiblings.push(curr);
          curr = curr.nextElementSibling;
        }

        // 3. Consume ALL trailing whitespace spacers directly following the wrapped text.
        // In Quill, hitting Enter at the end of wrapped text creates empty spacer blocks
        // (often tagged with editor-image-spacer-mobile-hide / image-spacer-mobile-hide)
        // simply to advance the cursor below the floated image in the editor.
        // Since rich-text-wrap-group (flow-root on desktop, flex-col on mobile) already isolates
        // the float and starts subsequent content on a new line, all consecutive trailing exit spacers
        // are non-intentional artifacts and cause unwanted blank gaps.
        while (curr && isWhitespaceSpacerBlock(curr)) {
          const exitSpacer = curr;
          curr = curr.nextElementSibling;
          exitSpacer.remove();
        }

        // Only group if there are text siblings following this image
        if (textSiblings.length > 0) {
          const group = doc.createElement('div');
          group.className = `rich-text-wrap-group wrap-${wrapMode}`;

          const textContainer = doc.createElement('div');
          textContainer.className = 'rich-text-wrap-text';

          parent.insertBefore(group, wrapper);
          group.appendChild(wrapper);

          textSiblings.forEach((sibling) => {
            textContainer.appendChild(sibling);
          });

          group.appendChild(textContainer);
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
    processedHtml = normalizeResponsiveLineHeightStyles(processedHtml);
    processedHtml = normalizeCustomLineHeightUnits(processedHtml);

    // Normalize isolated non-breaking spaces between words so phrases can wrap naturally on mobile
    processedHtml = normalizeWordSeparators(processedHtml);
    processedHtml = preserveSignificantInlineWhitespace(processedHtml);

    if (naturalTextWrapping) {
      processedHtml = normalizeNaturalTextWrapping(processedHtml, preserveLeadingIndent);
    }

    processedHtml = normalizeVietnameseHtml(processedHtml);
    return processedHtml;
  }, [html, naturalTextWrapping, normalizeNbsp, preserveLeadingIndent, preserveNbsp, configKey, stripAllFontStyles]);

  const isAboutKey = configKey ? ABOUT_KEYS.includes(configKey) : false;

  const contextLineHeight = useConfigContentByKey(configKey || "", "lineHeight");
  const contextLineHeightMobile = useConfigContentByKey(configKey || "", "lineHeightMobile");
  const contextFontSize = useConfigContentByKey(configKey || "", "fontSize");
  const contextFontSizeMobile = useConfigContentByKey(configKey || "", "fontSizeMobile");
  const contextTranslateX = useConfigContentByKey(configKey || "", "translateX");
  const contextTranslateXMobile = useConfigContentByKey(configKey || "", "translateXMobile");
  const contextTranslateY = useConfigContentByKey(configKey || "", "translateY");
  const contextTranslateYMobile = useConfigContentByKey(configKey || "", "translateYMobile");

  const activeLineHeight = lineHeight || contextLineHeight;
  const activeLineHeightMobile = lineHeightMobile || contextLineHeightMobile;
  const activeFontSize = fontSize || contextFontSize;
  const activeFontSizeMobile = fontSizeMobile || contextFontSizeMobile;
  const activeTranslateX = (translateX !== undefined && translateX !== null && translateX !== "") ? translateX : contextTranslateX;
  const activeTranslateXMobile = (translateXMobile !== undefined && translateXMobile !== null && translateXMobile !== "") ? translateXMobile : contextTranslateXMobile;
  const activeTranslateY = (translateY !== undefined && translateY !== null && translateY !== "") ? translateY : contextTranslateY;
  const activeTranslateYMobile = (translateYMobile !== undefined && translateYMobile !== null && translateYMobile !== "") ? translateYMobile : contextTranslateYMobile;
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const normalizeCssSize = (value: string | number) => {
    const cleanValue = String(value ?? '').trim();
    return /^-?\d+(\.\d+)?$/.test(cleanValue) ? `${cleanValue}px` : cleanValue;
  };

  const normalizeLineHeight = (value: string) => {
    const cleanValue = String(value).trim();
    if (cleanValue.startsWith("-")) return "";
    const num = parseFloat(cleanValue);
    if (!isNaN(num) && num > 0 && num <= 3 && !cleanValue.endsWith("px") && !cleanValue.endsWith("rem") && !cleanValue.endsWith("em") && !cleanValue.endsWith("%")) {
      return cleanValue;
    }
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
        styles['--custom-line-height'] = normalized;
        styles.lineHeight = normalized;
      }
    }
    if (activeLineHeightMobile) {
      const normalized = normalizeLineHeight(activeLineHeightMobile);
      if (normalized) styles['--custom-line-height-mobile'] = normalized;
    }
    if (isMobileViewport && activeLineHeightMobile) {
      const normalized = normalizeLineHeight(activeLineHeightMobile);
      if (normalized) styles.lineHeight = normalized;
    }
    if (activeFontSize) {
      styles['--fs-desktop'] = normalizeCssSize(activeFontSize);
    }
    if (activeFontSizeMobile) {
      styles['--fs-mobile'] = normalizeCssSize(activeFontSizeMobile);
    }
    if (viewportFontSize) {
      const normalized = normalizeCssSize(viewportFontSize);
      styles['--fs'] = normalized;
    }
    if (activeTranslateX !== undefined && activeTranslateX !== null && activeTranslateX !== "") {
      styles['--translate-x'] = normalizeCssSize(activeTranslateX);
    }
    if (activeTranslateXMobile !== undefined && activeTranslateXMobile !== null && activeTranslateXMobile !== "") {
      styles['--translate-x-mobile'] = normalizeCssSize(activeTranslateXMobile);
    }
    if (activeTranslateY !== undefined && activeTranslateY !== null && activeTranslateY !== "") {
      styles['--translate-y'] = normalizeCssSize(activeTranslateY);
    }
    if (activeTranslateYMobile !== undefined && activeTranslateYMobile !== null && activeTranslateYMobile !== "") {
      styles['--translate-y-mobile'] = normalizeCssSize(activeTranslateYMobile);
    }
    return styles;
  }, [Component, activeLineHeight, activeLineHeightMobile, activeFontSize, activeFontSizeMobile, activeTranslateX, activeTranslateXMobile, activeTranslateY, activeTranslateYMobile, isMobileViewport, naturalTextWrapping, preserveNbsp, stripAllFontStyles]);

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
  const responsiveIndentClassName = resetLeadingIndentOnMobile ? "rich-text-mobile-reset-indent" : "";
  const rendererClassName = `rich-text-renderer ${configClassName} ${responsiveIndentClassName} ${className}`.replace(/\s+/g, " ").trim();

  if (!html) return fallback ? <Component className={rendererClassName} style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", ...customStyles }}>{fallback}</Component> : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RICH_TEXT_RENDERER_STYLES }} />
      <Component
        className={rendererClassName}
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          ...customStyles,
        }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    </>
  );
};

const RICH_TEXT_RENDERER_STYLES = `
        .rich-text-renderer,
        .rich-text-renderer p,
        .rich-text-renderer div,
        .rich-text-renderer span,
        .rich-text-renderer li,
        .rich-text-renderer h1,
        .rich-text-renderer h2,
        .rich-text-renderer h3,
        .rich-text-renderer h4,
        .rich-text-renderer h5,
        .rich-text-renderer h6 {
          white-space: pre-wrap !important;
          overflow-wrap: break-word !important;
          tab-size: 4 !important;
          -moz-tab-size: 4 !important;
        }
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
        .rich-text-renderer h3,
        .rich-text-renderer h4,
        .rich-text-renderer h5,
        .rich-text-renderer h6,
        .rich-text-renderer hr,
        .rich-text-renderer table {
          clear: both !important;
        }
        .rich-text-renderer table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 1rem 0 !important;
          overflow-x: auto !important;
          display: table !important;
        }
        .rich-text-renderer th,
        .rich-text-renderer td {
          border: 1px solid #e5e7eb !important;
          padding: 0.5rem 0.75rem !important;
          text-align: left !important;
        }
        .rich-text-renderer iframe {
          max-width: 100% !important;
          border-radius: 8px !important;
          margin: 1rem auto !important;
          display: block !important;
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
          margin: 0 !important;
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
        .rich-text-renderer .image-wrapper .image-caption,
        .rich-text-renderer .image-caption {
          font-size: 13px !important;
          line-height: 1.35 !important;
          margin-top: 4px !important;
          margin-bottom: 8px !important;
          font-style: italic !important;
          color: #666666 !important;
          text-align: center !important;
        }
        @media (min-width: 768px) {
          .rich-text-renderer .image-caption,
          .rich-text-renderer [style*="--fs-desktop"] .image-caption,
          .rich-text-renderer .image-wrapper[style*="--fs-desktop"] .image-caption {
            font-size: 13px !important;
            line-height: 1.35 !important;
            margin-top: 4px !important;
            margin-bottom: 8px !important;
          }
        }
        @media (max-width: 767px) {
          .rich-text-renderer .image-caption,
          .rich-text-renderer [style*="--fs-mobile"] .image-caption,
          .rich-text-renderer .image-wrapper[style*="--fs-mobile"] .image-caption {
            font-size: 11px !important;
            line-height: 1.35 !important;
            margin-top: 3px !important;
            margin-bottom: 6px !important;
          }
          .rich-text-renderer li[style*="--fs-mobile"]::marker {
            font-size: var(--fs-mobile) !important;
          }
        }
        .rich-text-renderer [style*="--custom-line-height:"] {
          line-height: var(--custom-line-height) !important;
        }
        .rich-text-renderer[style*="--translate-x"],
        .rich-text-renderer[style*="--translate-y"],
        .rich-text-renderer [style*="--translate-x"],
        .rich-text-renderer [style*="--translate-y"] {
          transform: translate(var(--translate-x, 0px), var(--translate-y, 0px)) !important;
        }
        .rich-text-renderer span[style*="--translate-x"],
        .rich-text-renderer span[style*="--translate-y"] {
          display: inline-block !important;
        }
        .rich-text-renderer.inline-rich-text [style*="--translate-x"],
        .rich-text-renderer.inline-rich-text [style*="--translate-y"] {
          display: inline-block !important;
        }
        .rich-text-renderer.inline-rich-text[style*="--translate-x"],
        .rich-text-renderer.inline-rich-text[style*="--translate-y"] {
          position: relative !important;
          left: var(--translate-x, 0px) !important;
          top: var(--translate-y, 0px) !important;
          transform: none !important;
        }
        @media (max-width: 767px) {
          .rich-text-renderer [style*="--custom-line-height-mobile:"] {
            line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
          }
          .rich-text-renderer[style*="--translate-x"],
          .rich-text-renderer[style*="--translate-y"],
          .rich-text-renderer[style*="--translate-x-mobile"],
          .rich-text-renderer[style*="--translate-y-mobile"],
          .rich-text-renderer [style*="--translate-x"],
          .rich-text-renderer [style*="--translate-y"],
          .rich-text-renderer [style*="--translate-x-mobile"],
          .rich-text-renderer [style*="--translate-y-mobile"] {
            transform: translate(var(--translate-x-mobile, 0px), var(--translate-y-mobile, 0px)) !important;
          }
          .rich-text-renderer span[style*="--translate-x-mobile"],
          .rich-text-renderer span[style*="--translate-y-mobile"],
          .rich-text-renderer span[style*="--translate-x"],
          .rich-text-renderer span[style*="--translate-y"] {
            display: inline-block !important;
          }
          .rich-text-renderer.inline-rich-text [style*="--translate-x-mobile"],
          .rich-text-renderer.inline-rich-text [style*="--translate-y-mobile"],
          .rich-text-renderer.inline-rich-text [style*="--translate-x"],
          .rich-text-renderer.inline-rich-text [style*="--translate-y"] {
            display: inline-block !important;
          }
          .rich-text-renderer.inline-rich-text[style*="--translate-x-mobile"],
          .rich-text-renderer.inline-rich-text[style*="--translate-y-mobile"],
          .rich-text-renderer.inline-rich-text[style*="--translate-x"],
          .rich-text-renderer.inline-rich-text[style*="--translate-y"] {
            position: relative !important;
            left: var(--translate-x-mobile, 0px) !important;
            top: var(--translate-y-mobile, 0px) !important;
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
          clear: both !important;
          margin-right: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 0 !important;
          margin-left: 0 !important;
          display: inline !important;
        }
        /* Text wrapping: float right */
        .rich-text-renderer img[data-wrap="right"] {
          float: right !important;
          clear: both !important;
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
          clear: both !important;
          margin-right: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 0 !important;
          display: inline-block !important;
          position: relative !important;
        }
        .rich-text-renderer .image-wrap-right {
          float: right !important;
          clear: both !important;
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
        .rich-text-renderer .image-wrapper:not(:has(.image-caption)),
        .rich-text-renderer .image-wrapper:has(.image-caption:empty) {
          margin-bottom: 4px !important;
        }
        /* Caption in floated wrappers: position static for natural document flow and no text overlap */
        .rich-text-renderer .image-wrap-left .image-caption,
        .rich-text-renderer .image-wrap-right .image-caption {
          position: static !important;
          text-align: center !important;
          color: #666666 !important;
          font-style: italic !important;
          font-size: 13px !important;
          line-height: 1.35 !important;
          padding: 0 4px !important;
          margin-top: 4px !important;
          margin-bottom: 6px !important;
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

        /* Desktop: Preserve intentional line breaks (cách dòng) from Admin editor */
        @media (min-width: 768px) {
          .rich-text-renderer .ql-whitespace-preserve,
          .rich-text-renderer p.ql-whitespace-preserve,
          .rich-text-renderer .ql-whitespace-spacer,
          .rich-text-renderer p.ql-whitespace-spacer,
          .rich-text-renderer p:has(> br:only-child) {
            display: block !important;
            min-height: 1.5em !important;
            line-height: 1.5 !important;
            margin-top: 0 !important;
            margin-bottom: 0.5rem !important;
          }
          .rich-text-renderer .ql-whitespace-preserve:has(+ .image-wrapper),
          .rich-text-renderer .ql-whitespace-preserve:has(+ .rich-text-wrap-group),
          .rich-text-renderer .ql-whitespace-preserve:has(+ [class*="image-wrap"]),
          .rich-text-renderer p:has(> br:only-child):has(+ .image-wrapper),
          .rich-text-renderer p:has(> br:only-child):has(+ .rich-text-wrap-group),
          .rich-text-renderer p:has(> br:only-child):has(+ [class*="image-wrap"]) {
            display: block !important;
            min-height: 1.5em !important;
            line-height: 1.5 !important;
            padding-bottom: 0.75rem !important;
          }

          /* Desktop: flow-root wrap grouping for native float text wrap and clean boundary */
          .rich-text-renderer .rich-text-wrap-group,
          .rich-text-wrap-group {
            display: flow-root !important;
            width: 100% !important;
            margin-bottom: 0.5rem !important;
          }
          .rich-text-renderer .rich-text-wrap-text,
          .rich-text-wrap-text {
            display: contents !important;
          }
          .rich-text-renderer .rich-text-wrap-group > .rich-text-wrap-text > *:first-child:not(.ql-whitespace-preserve),
          .rich-text-wrap-group > .rich-text-wrap-text > *:first-child:not(.ql-whitespace-preserve) {
            margin-top: 0 !important;
          }
        }
        
        /* Responsive Mobile styles to stack wrapped images nicely */
        @media (max-width: 767px) {
          /* On mobile: preserve intentional line breaks (cách dòng) */
          .rich-text-renderer .ql-whitespace-preserve:not(.wrap-spacer-mobile-hide):not(.image-spacer-mobile-hide):not(.editor-image-spacer-mobile-hide):not([class*="mobile-hide"]),
          .rich-text-renderer p.ql-whitespace-preserve:not(.wrap-spacer-mobile-hide):not(.image-spacer-mobile-hide):not(.editor-image-spacer-mobile-hide):not([class*="mobile-hide"]),
          .rich-text-renderer .ql-whitespace-spacer:not(.wrap-spacer-mobile-hide):not(.image-spacer-mobile-hide):not(.editor-image-spacer-mobile-hide):not([class*="mobile-hide"]),
          .rich-text-renderer p.ql-whitespace-spacer:not(.wrap-spacer-mobile-hide):not(.image-spacer-mobile-hide):not(.editor-image-spacer-mobile-hide):not([class*="mobile-hide"]),
          .rich-text-renderer p:has(> br:only-child):not(.wrap-spacer-mobile-hide):not(.image-spacer-mobile-hide):not(.editor-image-spacer-mobile-hide):not([class*="mobile-hide"]) {
            display: block !important;
            min-height: 1.2em !important;
            line-height: 1.2 !important;
            margin-top: 0 !important;
            margin-bottom: 0.5rem !important;
          }

          /* Wrap text grouping: text first (order: 1), image second (order: 2) */
          .rich-text-renderer .rich-text-wrap-group,
          .rich-text-wrap-group {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            margin-bottom: 12px !important;
          }
          .rich-text-renderer .rich-text-wrap-text,
          .rich-text-wrap-text {
            display: block !important;
            order: 1 !important;
            width: 100% !important;
          }
          .rich-text-renderer .rich-text-wrap-text > *:first-child {
            margin-top: 0 !important;
          }
          .rich-text-renderer .rich-text-wrap-text > *:last-child {
            margin-bottom: 0 !important;
          }
          .rich-text-renderer .rich-text-wrap-group > .image-wrapper,
          .rich-text-wrap-group > .image-wrapper {
            display: block !important;
            order: 2 !important;
            float: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 10px !important;
            margin-bottom: 0px !important;
          }
          .rich-text-renderer .rich-text-wrap-group > .image-wrapper img,
          .rich-text-wrap-group > .image-wrapper img {
            float: none !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-bottom: 0px !important;
          }
          .rich-text-renderer .rich-text-wrap-group > .image-wrapper .image-caption,
          .rich-text-wrap-group > .image-wrapper .image-caption {
            display: block !important;
            position: static !important;
            clear: both !important;
            font-size: 11px !important;
            margin-top: 3px !important;
            margin-bottom: 6px !important;
            padding: 0 8px !important;
            line-height: 1.35 !important;
            font-style: italic !important;
            text-align: center !important;
          }

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
          /* Inside a wrap-group, image comes LAST (order:2) so margin-bottom must be 0 */
          .rich-text-renderer .rich-text-wrap-group > .image-wrapper.image-wrap-left,
          .rich-text-renderer .rich-text-wrap-group > .image-wrapper.image-wrap-right,
          .rich-text-renderer .rich-text-wrap-group > .image-wrapper {
            margin-bottom: 0 !important;
            margin-top: 10px !important;
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
            font-size: 11px !important;
            margin-top: 3px !important;
            margin-bottom: 6px !important;
            padding: 0 8px !important;
            line-height: 1.35 !important;
            font-style: italic !important;
            text-align: center !important;
          }
          /* On mobile, reset caption back to static (no float, no absolute) */
          .rich-text-renderer .image-wrap-left .image-caption,
          .rich-text-renderer .image-wrap-right .image-caption {
            position: static !important;
            margin-top: 3px !important;
            margin-bottom: 6px !important;
            font-size: 11px !important;
          }
          .rich-text-renderer .image-wrap-left img,
          .rich-text-renderer .image-wrap-right img {
            margin-bottom: 0 !important;
          }

          /* Hide whitespace spacer paragraphs placed directly inside wrap text or associated with images on mobile */
          .rich-text-renderer .wrap-spacer-mobile-hide,
          .rich-text-renderer .editor-image-spacer-mobile-hide,
          .rich-text-renderer .image-spacer-mobile-hide,
          .rich-text-renderer [class*="wrap-spacer-mobile-hide"],
          .rich-text-renderer [class*="image-spacer-mobile-hide"],
          .rich-text-renderer [class*="editor-image-spacer-mobile-hide"],
          .rich-text-renderer .rich-text-wrap-text .wrap-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-text .editor-image-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-text .image-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-text p:empty,
          .rich-text-renderer .rich-text-wrap-group > .wrap-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-group ~ .wrap-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-group ~ .editor-image-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-group + .wrap-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-group + .editor-image-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-group + .image-spacer-mobile-hide,
          .rich-text-renderer .rich-text-wrap-group + p:has(> br:only-child),
          .rich-text-renderer .rich-text-wrap-group + p:empty,
          .rich-text-renderer .image-wrapper + .wrap-spacer-mobile-hide,
          .rich-text-renderer .image-wrapper + .editor-image-spacer-mobile-hide,
          .rich-text-renderer .image-wrapper + .image-spacer-mobile-hide,
          .rich-text-renderer img + .wrap-spacer-mobile-hide,
          .rich-text-renderer img + .editor-image-spacer-mobile-hide,
          .rich-text-renderer img + .image-spacer-mobile-hide {
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            line-height: 0 !important;
            font-size: 0 !important;
            border: none !important;
          }

          /* Collapse consecutive empty whitespace paragraphs on mobile so 5-6 Enter hits don't create blank voids */
          .rich-text-renderer p:has(> br:only-child) + p:has(> br:only-child),
          .rich-text-renderer p:empty + p:empty,
          .rich-text-renderer p:has(> br:only-child) + p:empty,
          .rich-text-renderer p:empty + p:has(> br:only-child) {
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            line-height: 0 !important;
            font-size: 0 !important;
          }

          /* Mobile: Force left alignment for all text in blog and room details,
             ensuring any admin-defined right/center alignments only apply on desktop */
          .rich-text-renderer.blog-content p,
          .rich-text-renderer.blog-content h1,
          .rich-text-renderer.blog-content h2,
          .rich-text-renderer.blog-content h3,
          .rich-text-renderer.blog-content h4,
          .rich-text-renderer.blog-content h5,
          .rich-text-renderer.blog-content h6,
          .rich-text-renderer.blog-content li,
          .rich-text-renderer.blog-content blockquote,
          .rich-text-renderer.blog-content div:not(.image-wrapper):not(.image-caption),
          .rich-text-renderer.blog-content .ql-align-right,
          .rich-text-renderer.blog-content .ql-align-right *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.blog-content .ql-align-center,
          .rich-text-renderer.blog-content .ql-align-center *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.blog-content .ql-align-justify,
          .rich-text-renderer.blog-content .ql-align-justify *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.blog-content [style*="text-align"],
          .rich-text-renderer.blog-content [style*="text-align"] *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.room-detail-content p,
          .rich-text-renderer.room-detail-content h1,
          .rich-text-renderer.room-detail-content h2,
          .rich-text-renderer.room-detail-content h3,
          .rich-text-renderer.room-detail-content h4,
          .rich-text-renderer.room-detail-content h5,
          .rich-text-renderer.room-detail-content h6,
          .rich-text-renderer.room-detail-content li,
          .rich-text-renderer.room-detail-content blockquote,
          .rich-text-renderer.room-detail-content div:not(.image-wrapper):not(.image-caption),
          .rich-text-renderer.room-detail-content .ql-align-right,
          .rich-text-renderer.room-detail-content .ql-align-right *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.room-detail-content .ql-align-center,
          .rich-text-renderer.room-detail-content .ql-align-center *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.room-detail-content .ql-align-justify,
          .rich-text-renderer.room-detail-content .ql-align-justify *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.room-detail-content [style*="text-align"],
          .rich-text-renderer.room-detail-content [style*="text-align"] *:not(.image-caption):not(.image-caption *),
          .rich-text-renderer.blog-content-area p,
          .rich-text-renderer.blog-content-area [style*="text-align"],
          .rich-text-renderer.ckeditor-content p,
          .rich-text-renderer.ckeditor-content [style*="text-align"],
          .rich-text-renderer.room-summary-desc p,
          .rich-text-renderer.room-summary-desc [style*="text-align"] {
            text-align: left !important;
          }

          /* Ensure image captions remain centered on mobile */
          .rich-text-renderer.blog-content .image-caption,
          .rich-text-renderer.blog-content .image-caption *,
          .rich-text-renderer.blog-content figcaption,
          .rich-text-renderer.blog-content figcaption *,
          .rich-text-renderer.room-detail-content .image-caption,
          .rich-text-renderer.room-detail-content .image-caption *,
          .rich-text-renderer.room-detail-content figcaption,
          .rich-text-renderer.room-detail-content figcaption *,
          .rich-text-renderer.ckeditor-content .image-caption,
          .rich-text-renderer.ckeditor-content .image-caption * {
            text-align: center !important;
          }

          /* Mobile: Natural line wrapping without artificial phrase compounds or rigid whitespace locks */
          .rich-text-renderer p:not(.ql-whitespace-spacer),
          .rich-text-renderer div:not(.image-wrapper):not(.image-caption):not(.ql-whitespace-spacer),
          .rich-text-renderer li,
          .rich-text-renderer blockquote,
          .rich-text-renderer span:not(.ql-whitespace-spacer),
          .rich-text-renderer strong,
          .rich-text-renderer em {
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            hyphens: manual !important;
          }
        }
        
        .image-caption {
          text-align: center;
          color: #666;
          font-size: 13px;
          margin-top: 4px;
          margin-bottom: 8px;
          font-style: italic;
          line-height: 1.35;
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

        .rich-text-renderer[style*="--custom-line-height:"] > * {
          line-height: var(--custom-line-height) !important;
        }

        @media (max-width: 767px) {
          .rich-text-renderer[style*="--custom-line-height-mobile:"] > * {
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
