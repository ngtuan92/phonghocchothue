import React, { forwardRef, useEffect, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const SIZE_MAP = {
  "Small": "0.75rem",
  "Normal": "1rem",
  "Large": "2.5rem",
  "Huge": "6.5rem",
  "Super Huge": "17rem"
};

let cachedFonts = null;
let fetchPromise = null;

const createModules = (fontList) => ({
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: fontList }],
    [{ size: Object.values(SIZE_MAP) }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
  clipboard: {
    matchers: [
      [Node.ELEMENT_NODE, (node, delta) => {
        const style = node.getAttribute('style');
        if (style && style.includes('font-family')) {
          const cleanStyle = style.replace(/font-family:\s*(&quot;|['"])?([^;'"&]+)(&quot;|['"])?/i, 'font-family: $2');
          if (cleanStyle !== style) {
            node.setAttribute('style', cleanStyle);
          }
        }
        return delta;
      }]
    ]
  }
});

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
  
  const SizeStyle = Quill.import("attributors/style/size");
  if (SizeStyle) {
    SizeStyle.whitelist = Object.values(SIZE_MAP);
    Quill.register(SizeStyle, true);
  }
  const AlignStyle = Quill.import("attributors/style/align");
  if (AlignStyle) {
    Quill.register(AlignStyle, true);
  }
}

const FORMATS = [
  "header", "font", "size", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align", "link", "image"
];

const slugify = (name) => name.trim().toLowerCase().replace(/\s+/g, '-');

const QuillWrapper = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [modules, setModules] = useState(null);
  const [dynamicFonts, setDynamicFonts] = useState([]);

  React.useImperativeHandle(ref, () => ({
    getEditor: () => {
      try {
        return editorRef.current?.getEditor();
      } catch (e) {
        return null;
      }
    },
    focus: () => {
      try {
        editorRef.current?.focus();
      } catch (e) { }
    },
    blur: () => {
      try {
        editorRef.current?.blur();
      } catch (e) { }
    },
  }));

  useEffect(() => {
    const initFonts = async () => {
      if (!cachedFonts) {
        if (!fetchPromise) {
          fetchPromise = (async () => {
            try {
              const res = await fetch(`${URL_API}api/fonts`);
              if (res.ok) {
                const fonts = await res.json();
                const clean = fonts
                  .filter(f => f.name.trim().toLowerCase() !== 'inter')
                  .map(f => ({ 
                    ...f, 
                    name: f.name.trim(),
                    slug: slugify(f.name) 
                  }));
                const sorted = clean.sort((a, b) => a.name.localeCompare(b.name));
                const finalWhitelist = ['macdinh', ...sorted.map(f => f.slug)];
                
                if (typeof window !== "undefined" && Quill) {
                  const FontStyle = Quill.import("attributors/style/font");
                  if (FontStyle) {
                    FontStyle.whitelist = finalWhitelist;
                    Quill.register(FontStyle, true);
                  }
                }
                cachedFonts = sorted;
                return sorted;
              }
            } catch (e) {
              console.error(e);
            }
            return [];
          })();
        }
        const result = await fetchPromise;
        setDynamicFonts(result);
      } else {
        setDynamicFonts(cachedFonts);
      }
    };
    initFonts();
  }, []);

  useEffect(() => {
    if (dynamicFonts.length > 0 || (cachedFonts && cachedFonts.length >= 0)) {
      const currentFonts = dynamicFonts.length > 0 ? dynamicFonts : (cachedFonts || []);
      const toolbarFontValues = ['macdinh', ...currentFonts.map(f => f.slug)];
      setModules(createModules(toolbarFontValues));
      setIsReady(true);
    }
  }, [dynamicFonts]);

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
        quill.root.addEventListener("click", (ev) => {
          const img = ev.target;
          if (img.tagName === "IMG") {
            const currentAlt = img.getAttribute("alt") || img.getAttribute("title") || "";
            openAltModal({ alt: currentAlt }, (newData) => {
              img.setAttribute("alt", newData.alt);
              img.setAttribute("title", newData.alt);
              const range = quill.getSelection();
              quill.setSelection(range);
            });
          }
        });
      }
    }
  }, [isReady]);

  const fileInputRef = useRef(null);

  const customModules = React.useMemo(() => {
    if (!modules) return null;
    const mods = { ...modules };
    mods.toolbar = {
      container: modules.toolbar,
      handlers: {
        image: function () {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }
      }
    };
    return mods;
  }, [modules]);

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
        alert("Lỗi tải ảnh");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối");
    } finally {
      e.target.value = "";
    }
  };

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div className="quill-wrapper-container relative">
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
      {!modules ? (
        <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đang khởi tạo trình soạn thảo...</span>
          </div>
        </div>
      ) : (
        <ReactQuill
          key={dynamicFonts.map(f => f.name).join(',')}
          ref={editorRef}
          {...props}
          modules={customModules}
          formats={props.formats || FORMATS}
        />
      )}
      <style jsx global>{`
        .ql-editor {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="macdinh"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="macdinh"]::before { 
          content: 'Mặc định (Inter)' !important; 
          font-family: 'Inter', sans-serif !important;
        }
        ${dynamicFonts.map(font => `
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${font.slug}"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${font.slug}"]::before { 
            content: '${font.name}' !important; 
            font-family: '${font.name}', sans-serif !important;
          }
          .ql-editor span[style*="font-family: ${font.slug}"],
          .ql-editor span[style*="font-family:${font.slug}"],
          .ql-editor span[style*="font-family: '${font.slug}'"],
          .ql-editor span[style*="font-family:'${font.slug}'"],
          .ql-editor span[style*='font-family: "${font.slug}"'],
          .ql-editor span[style*='font-family:"${font.slug}"'],
          .ql-editor p[style*="font-family: ${font.slug}"],
          .ql-editor h1[style*="font-family: ${font.slug}"],
          .ql-editor h2[style*="font-family: ${font.slug}"],
          .ql-editor h3[style*="font-family: ${font.slug}"] {
            font-family: '${font.name}', sans-serif !important;
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
      `}</style>
    </div>
  );
});

QuillWrapper.displayName = "QuillWrapper";
export default QuillWrapper;
