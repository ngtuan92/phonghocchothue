import React, { useEffect, useRef, useState } from "react";

export const shouldUseLiteEditor = () => {
  if (typeof window === "undefined") return true;

  try {
    if (window.localStorage?.getItem("admin-full-editor") === "1") return false;
    if (window.localStorage?.getItem("admin-lite-editor") === "1") return true;
  } catch {
    // Some mobile browsers can block storage in private/restricted contexts.
  }

  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
  const smallScreen = window.matchMedia?.("(max-width: 767px)").matches;
  const lowCpu =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4;
  const lowMemory =
    typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;

  return Boolean(coarsePointer || smallScreen || lowCpu || lowMemory);
};

export const useLiteEditorMode = () => {
  const [useLiteEditor, setUseLiteEditor] = useState(true);

  useEffect(() => {
    const sync = () => setUseLiteEditor(shouldUseLiteEditor());
    sync();

    const smallScreenQuery = window.matchMedia?.("(max-width: 767px)");
    const pointerQuery = window.matchMedia?.("(pointer: coarse)");

    smallScreenQuery?.addEventListener?.("change", sync);
    pointerQuery?.addEventListener?.("change", sync);
    smallScreenQuery?.addListener?.(sync);
    pointerQuery?.addListener?.(sync);

    return () => {
      smallScreenQuery?.removeEventListener?.("change", sync);
      pointerQuery?.removeEventListener?.("change", sync);
      smallScreenQuery?.removeListener?.(sync);
      pointerQuery?.removeListener?.(sync);
    };
  }, []);

  return useLiteEditor;
};

const isEmptyHtml = (html) => {
  if (!html || html === "<p><br></p>" || html === "<br>") return true;
  if (typeof document === "undefined") return false;

  const node = document.createElement("div");
  node.innerHTML = html;
  const hasMedia = Boolean(node.querySelector("img, video, iframe, table"));
  const text = (node.textContent || node.innerText || "").trim();

  return !hasMedia && text.length === 0;
};

const LiteRichTextEditor = React.memo(function LiteRichTextEditor({
  value = "",
  onChange,
  onDraftChange,
  onBlur,
  placeholder,
  minHeight = "120px",
  maxHeight = "360px",
  className = "",
  commitOnBlurOnly = false,
}) {
  const editorRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(() => isEmptyHtml(value));

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== (value || "")) {
      editor.innerHTML = value || "";
      setIsEmpty(isEmptyHtml(value));
    }
  }, [value]);

  const readHtml = () => editorRef.current?.innerHTML || "";

  const handleInput = () => {
    const html = readHtml();
    setIsEmpty(isEmptyHtml(html));
    onDraftChange?.(html);
    if (!commitOnBlurOnly) {
      onChange?.(html);
    }
  };

  const handleBlur = () => {
    const html = readHtml();
    setIsEmpty(isEmptyHtml(html));
    onDraftChange?.(html);
    if (commitOnBlurOnly && onBlur) {
      onBlur(html);
      return;
    }
    onChange?.(html);
    onBlur?.(html);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        className="admin-lite-rich-text w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-relaxed text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        style={{
          minHeight,
          maxHeight,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          contain: "layout paint",
        }}
      />
      {isEmpty && placeholder && (
        <span className="pointer-events-none absolute left-3 top-3 text-sm text-gray-400">
          {placeholder}
        </span>
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .admin-lite-rich-text img,
            .admin-lite-rich-text video,
            .admin-lite-rich-text iframe {
              max-width: 100%;
              height: auto;
            }
          `,
        }}
      />
    </div>
  );
});

export default LiteRichTextEditor;
