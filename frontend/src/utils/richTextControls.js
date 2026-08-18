const RESPONSIVE_CONTROL_PROPERTIES = [
  "--fs-desktop",
  "--fs-mobile",
  "--custom-line-height",
  "--custom-line-height-mobile",
  "--translate-y",
  "--translate-y-mobile",
];

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
