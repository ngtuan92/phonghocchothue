const RESPONSIVE_CONTROL_PROPERTIES = [
  "--fs-desktop",
  "--fs-mobile",
  "--custom-line-height",
  "--custom-line-height-mobile",
  "--translate-x",
  "--translate-x-mobile",
  "--translate-y",
  "--translate-y-mobile",
];

export const normalizeResponsiveLineHeightStyles = (html) => {
  if (!html || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll("[style]").forEach((node) => {
    const legacyLineHeight = node.style.getPropertyValue("line-height").trim();
    const desktopLineHeight = node.style.getPropertyValue("--custom-line-height").trim();
    const mobileLineHeight = node.style.getPropertyValue("--custom-line-height-mobile").trim();

    // Older Quill content stored desktop spacing as line-height and mobile
    // spacing as a CSS variable. Migrate only this identifiable legacy pair.
    if (legacyLineHeight && mobileLineHeight) {
      if (!desktopLineHeight) {
        node.style.setProperty("--custom-line-height", legacyLineHeight);
      }
      node.style.removeProperty("line-height");
    } else if (legacyLineHeight && desktopLineHeight) {
      node.style.removeProperty("line-height");
    }

    if (!node.getAttribute("style")) node.removeAttribute("style");
  });

  return root.innerHTML;
};

export const normalizeExcessiveLeadingWhitespaceAlignment = (html, minimumIndent = 24) => {
  if (!html || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote").forEach((block) => {
    if (block.querySelector("img, video, iframe, svg, canvas, table")) return;

    const explicitAlignment = block.style.getPropertyValue("text-align").trim();
    const hasNonCenterAlignment =
      block.classList.contains("ql-align-right") ||
      block.classList.contains("ql-align-justify") ||
      (explicitAlignment && explicitAlignment !== "center");
    if (hasNonCenterAlignment) return;

    const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const leadingNodes = [];
    let visualIndent = 0;
    let foundContent = false;
    let node = walker.nextNode();

    while (node) {
      const value = String(node.textContent || "");
      const leading = value.match(/^[\t \u00a0]+/)?.[0] || "";
      if (leading) {
        leadingNodes.push({ node, length: leading.length });
        visualIndent += Array.from(leading).reduce(
          (total, character) => total + (character === "\t" ? 4 : 1),
          0
        );
      }

      if (value.slice(leading.length).length > 0) {
        foundContent = true;
        break;
      }
      node = walker.nextNode();
    }

    if (!foundContent || visualIndent < minimumIndent) return;

    leadingNodes.forEach(({ node: textNode, length }) => {
      textNode.textContent = String(textNode.textContent || "").slice(length);
    });
    block.classList.remove("ql-align-right", "ql-align-justify");
    block.classList.add("ql-align-center");
    block.style.removeProperty("text-align");

    Array.from(block.querySelectorAll("span")).reverse().forEach((span) => {
      if (!span.textContent && !span.children.length && !span.classList.contains("ql-ui")) {
        span.remove();
      }
    });
  });

  return root.innerHTML;
};

export const stripTopLevelResponsiveControls = (html) => {
  if (!html || typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  Array.from(root.children).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    RESPONSIVE_CONTROL_PROPERTIES.forEach((property) => {
      node.style.removeProperty(property);
    });
    node.removeAttribute("data-rich-text-controls");
    if (!node.getAttribute("style")) node.removeAttribute("style");
  });

  return root.innerHTML;
};
