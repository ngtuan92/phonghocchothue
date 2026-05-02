import React, { forwardRef, useEffect, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

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

if (typeof window !== "undefined" && Quill) {
  const ImageBlot = Quill.import("formats/image");
  class CustomImageBlot extends ImageBlot {
    static create(value) {
      const node = super.create(value);
      if (typeof value === "string") {
        node.setAttribute("src", value);
      } else if (value && typeof value === "object") {
        node.setAttribute("src", value.src);
        if (value.alt) node.setAttribute("alt", value.alt);
        if (value.title) node.setAttribute("title", value.title);
      }
      return node;
    }

    static value(node) {
      return {
        src: node.getAttribute("src"),
        alt: node.getAttribute("alt"),
        title: node.getAttribute("title"),
      };
    }
  }
  CustomImageBlot.blotName = "image";
  CustomImageBlot.tagName = "img";
  Quill.register(CustomImageBlot, true);
}

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ alt: "" });
  const [modalCallback, setModalCallback] = useState(null);

  const openAltModal = (initialData, callback) => {
    setModalData(initialData);
    setModalCallback(() => callback);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e) => {
    if (e) e.preventDefault();
    if (modalCallback) modalCallback(modalData);
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (isReady && editorRef.current) {
      const quill = editorRef.current.getEditor();
      if (quill) {
        // Handle clicking images to edit alt text
        quill.root.addEventListener("click", (ev) => {
          const img = ev.target;
          if (img.tagName === "IMG") {
            const currentAlt = img.getAttribute("alt") || img.getAttribute("title") || "";
            
            openAltModal({ alt: currentAlt }, (newData) => {
              img.setAttribute("alt", newData.alt);
              img.setAttribute("title", newData.alt); // Keep title same as alt
              
              // Trigger change for React state
              const range = quill.getSelection();
              quill.setSelection(range);
            });
          }
        });

        if (props.value) {
          const currentHtml = quill.root.innerHTML;
          if ((props.value.includes('font-family') && !currentHtml.includes('font-family')) ||
            (props.value.includes('font-size') && !currentHtml.includes('font-size'))) {
            quill.clipboard.dangerouslyPasteHTML(props.value);
          }
        }
      }
    }
  }, [isReady]);

  const fileInputRef = useRef(null);

  const customModules = React.useMemo(() => ({
    ...MODULES,
    toolbar: {
      container: MODULES.toolbar,
      handlers: {
        image: function() {
          fileInputRef.current?.click();
        }
      }
    }
  }), []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const quill = editorRef.current?.getEditor();
    if (!quill) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${URL_API}api/upload/image`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.uploaded) {
        const range = quill.getSelection(true);
        
        openAltModal({ alt: "" }, (newData) => {
          quill.insertEmbed(range.index, "image", { 
            src: result.url, 
            alt: newData.alt,
            title: newData.alt 
          }, "user");
          quill.setSelection(range.index + 1);
        });
      } else {
        alert("Tải ảnh thất bại: " + (result.error?.message || "Lỗi không xác định"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Lỗi kết nối máy chủ khi tải ảnh");
    } finally {
      e.target.value = "";
    }
  };

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div className="quill-wrapper-container relative">
      {/* Custom Alt Text Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200 font-inter">
            <div className="bg-primary/5 p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-700">Thông tin hình ảnh</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-4 ml-1">Mô tả ảnh (Alt & Title text)</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold text-navy-900 placeholder:text-gray-300"
                  placeholder="Ví dụ: Không gian phòng học hiện đại..."
                  value={modalData.alt}
                  onChange={(e) => setModalData({ ...modalData, alt: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-50 hover:text-red-500 transition-all active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleModalSubmit()}
                  className="flex-1 px-6 py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />
      <ReactQuill
        ref={editorRef}
        {...props}
        modules={props.modules || customModules}
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
