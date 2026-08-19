const RESPONSIVE_CONTROL_PROPERTIES = [
  "--fs-desktop",
  "--fs-mobile",
  "--custom-line-height",
  "--custom-line-height-mobile",
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
