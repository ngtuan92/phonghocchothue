import React, { forwardRef, useEffect, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const FONT_FAMILIES = [
  "Roboto", "Playfair Display", "Montserrat", "Poppins",
  "Raleway", "Dancing Script", "Pacifico", "Amatic SC", "Bebas Neue",
  "Syncopate", "Great Vibes", "Pinyon Script", "Alex Brush", "Parisienne",
  "Tangerine", "Satisfy", "Caveat", "Oswald", "Lato", "Nunito", "Quicksand",
  "Arial", "Times New Roman", "serif", "monospace", "Inter", "iCiel Amber", "FontViet"
];

const SIZE_MAP = {
  "Small": "0.75rem",
  "Normal": "1rem",
  "Large": "2.5rem",
  "Huge": "6.5rem",
  "Super Huge": "17rem"
};

if (typeof window !== "undefined" && Quill) {
  const FontStyle = Quill.import("attributors/style/font");
  if (FontStyle) {
    FontStyle.whitelist = FONT_FAMILIES;
    Quill.register(FontStyle, true);
  }

  const SizeStyle = Quill.import("attributors/style/size");
  if (SizeStyle) {
    SizeStyle.whitelist = Object.values(SIZE_MAP);
    Quill.register(SizeStyle, true);
  }
}

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [false, ...FONT_FAMILIES] }],
    [{ size: Object.values(SIZE_MAP) }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

const FORMATS = [
  "header", "font", "size", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align", "link", "image"
];

const QuillWrapper = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  React.useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current?.getEditor(),
    focus: () => editorRef.current?.focus(),
    blur: () => editorRef.current?.blur(),
  }));

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady && editorRef.current && props.value) {
      const quill = editorRef.current.getEditor();
      if (quill) {
        const currentHtml = quill.root.innerHTML;
        if ((props.value.includes('font-family') && !currentHtml.includes('font-family')) ||
          (props.value.includes('font-size') && !currentHtml.includes('font-size'))) {
          quill.clipboard.dangerouslyPasteHTML(props.value);
        }
      }
    }
  }, [isReady, props.value]);

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div className="quill-wrapper-container">
      <ReactQuill
        ref={editorRef}
        {...props}
        modules={props.modules || MODULES}
        formats={props.formats || FORMATS}
      />
      <style jsx global>{`
        .ql-snow .ql-picker.ql-font .ql-picker-label::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item::before { content: 'Default font' !important; }
        
        ${FONT_FAMILIES.map(f => `
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${f}"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${f}"]::before { 
            content: '${f}' !important; 
          }
        `).join('\n')}

        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before { content: 'Normal' !important; }

        ${Object.entries(SIZE_MAP).map(([label, value]) => `
          .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${value}"]::before,
          .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${value}"]::before { 
            content: '${label}' !important; 
          }
        `).join('\n')}

        .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor h5, .ql-editor h6 { 
          line-height: 1.1 !important; 
          margin-bottom: 0.5rem !important;
        }
        .ql-editor { font-size: 1rem; }
      `}</style>
    </div>
  );
});

QuillWrapper.displayName = "QuillWrapper";

export default QuillWrapper;
