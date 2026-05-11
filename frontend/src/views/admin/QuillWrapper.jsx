import React, { forwardRef, useEffect, useRef, useState, useCallback } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Modal from "@/components/admin/Modal";
import { Input, Button } from "@material-tailwind/react";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/");

const SIZE_MAP = {
  "Small": "0.85rem",
  "Normal": "1.5rem",
  "Large": "2.5rem",
  "Huge": "6.5rem",
  "Super Huge": "17rem"
};

let cachedFonts = null;
let fetchPromise = null;
const COLORS = [
  "#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff",
  "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff",
  "#bbbbbb", "#f06666", "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff",
  "#888888", "#a10000", "#b26b00", "#b2b200", "#006100", "#0047b2", "#6b24b2",
  "#444444", "#5c0000", "#663d00", "#666600", "#003700", "#002966", "#3d1466",
  "#f1c40f", "#f39c12", "#e67e22", "#d35400", "#7f8c8d", "#34495e", "#2c3e50",
  "#ffeacb", "#ffd19a", "#ffb347", "#799f85", "#e57f7f", "#563c39", "#323232"
];

const createModules = (fontList) => ({
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: fontList }],
    [{ size: Object.values(SIZE_MAP) }],
    ["bold", "italic", "underline", "strike"],
    [{ color: COLORS }, { background: COLORS }],
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
        if (value.width) {
          node.setAttribute("width", value.width);
          node.style.width = value.width.includes('%') || value.width.includes('px') ? value.width : `${value.width}px`;
        }
        if (value.style) node.setAttribute("style", value.style);
      }
      return node;
    }
    static value(node) {
      return {
        src: node.getAttribute("src"),
        alt: node.getAttribute("alt"),
        title: node.getAttribute("title"),
        width: node.getAttribute("width"),
        style: node.getAttribute("style"),
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

  const icons = Quill.import('ui/icons');
  if (icons) {
    icons['image-settings'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M22.7,19L24,20.3L14.6,29.7L13.3,28.4L22.7,19M7,2V4H8V2H7M11,2V4H12V2H11M15,2V4H16V2H15M19,2V4H20V2H19M5,4V28H19V18.1L21,16.1V28A2,2 0 0,1 19,30H5A2,2 0 0,1 3,28V4A2,2 0 0,1 5,2H19A2,2 0 0,1 21,4V10.1L19,12.1V4H5M20.2,13C20.3,13 20.5,13.1 20.6,13.2L21.8,14.4C22,14.6 22,15 21.8,15.2L20.8,16.2L18.8,14.2L19.8,13.2C19.9,13.1 20,13 20.2,13M18.1,14.9L20.1,16.9L14,23L12,21L18.1,14.9Z" />
      </svg>
    `;
  }
}

const FORMATS = [
  "header", "font", "size", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align", "link", "image"
];

const slugify = (name) => name.trim().toLowerCase().replace(/\s+/g, '-');

const QuillWrapper = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [modules, setModules] = useState(null);
  const [dynamicFonts, setDynamicFonts] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const selectedImageRef = useRef(null);
  const [resizerRect, setResizerRect] = useState(null);
  const resizerOverlayRef = useRef(null);
  const containerClickRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
              const googleRes = await fetch(`${URL_API}api/fonts`);
              let googleFonts = [];
              if (googleRes.ok) {
                const data = await googleRes.json();
                googleFonts = data
                  .filter(f => f.name.trim().toLowerCase() !== 'inter')
                  .map(f => ({ 
                    name: f.name.trim(),
                    slug: slugify(f.name),
                    family: f.name.trim() 
                  }));
              }

              const localRes = await fetch(`${URL_API}api/fonts/local`);
              let localFonts = [];
              if (localRes.ok) {
                const result = await localRes.json();
                if (result.success && Array.isArray(result.data)) {
                  localFonts = result.data
                    .filter(f => f.status === 'active')
                    .map(f => ({
                      name: f.display_name,
                      slug: f.font_family,
                      family: f.font_family
                    }));
                }
              }
              const combined = [...googleFonts, ...localFonts];
              const sorted = combined.sort((a, b) => a.name.localeCompare(b.name));
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
  const [modalData, setModalData] = useState({ alt: "", title: "", width: "" });
  const [modalCallback, setModalCallback] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "" });

  const openAltModal = (initialData, callback) => {
    setModalData({
      alt: initialData.alt || "",
      title: initialData.title || "",
      width: initialData.width || ""
    });
    setModalCallback(() => callback);
    setIsModalOpen(true);
  };

  const showAlert = (message) => {
    setAlertConfig({ isOpen: true, message });
  };

  const handleModalSubmit = (e) => {
    if (e) e.preventDefault();
    if (modalCallback) modalCallback(modalData);
    setIsModalOpen(false);
  };

  const updateResizerRect = useCallback(() => {
    const img = selectedImageRef.current;
    if (img && containerRef.current && img.isConnected) {
      try {
        const imgRect = img.getBoundingClientRect();
        const wrapperRect = containerRef.current.getBoundingClientRect();
        setResizerRect({
          top: imgRect.top - wrapperRect.top,
          left: imgRect.left - wrapperRect.left,
          width: imgRect.width,
          height: imgRect.height
        });
      } catch (e) {
        setResizerRect(null);
      }
    } else {
      setResizerRect(null);
    }
  }, []);

  useEffect(() => {
    if (selectedImage) {
      updateResizerRect();
      const resizeObserver = new ResizeObserver(updateResizerRect);
      resizeObserver.observe(selectedImage);
      window.addEventListener('resize', updateResizerRect);
      const quill = editorRef.current?.getEditor();
      if (quill) {
        quill.root.addEventListener('scroll', updateResizerRect);
      }
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateResizerRect);
        if (quill) {
          quill.root.removeEventListener('scroll', updateResizerRect);
        }
      };
    } else {
      setResizerRect(null);
    }
  }, [selectedImage, updateResizerRect]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const handleContainerClick = (ev) => {
      const img = ev.target.closest && ev.target.closest('img');
      const quill = editorRef.current?.getEditor();
      if (!quill) return;

      if (img && quill.root.contains(img)) {
        selectedImageRef.current = img;
        setSelectedImage(img);
        return;
      }

      // Clicked outside image — deselect
      if (selectedImageRef.current) {
        selectedImageRef.current = null;
        setSelectedImage(null);
      }
    };

    const handleContainerDblClick = (ev) => {
      const img = ev.target.closest && ev.target.closest('img');
      const quill = editorRef.current?.getEditor();
      if (!quill || !img || !quill.root.contains(img)) return;
      openAltModal(
        { alt: img.getAttribute('alt') || '', title: img.getAttribute('title') || '' },
        (newData) => {
          img.setAttribute('alt', newData.alt);
          img.setAttribute('title', newData.title);
        }
      );
    };

    const container = containerRef.current;
    container.addEventListener('click', handleContainerClick);
    container.addEventListener('dblclick', handleContainerDblClick);
    containerClickRef.current = handleContainerClick;

    return () => {
      container.removeEventListener('click', handleContainerClick);
      container.removeEventListener('dblclick', handleContainerDblClick);
    };
  }, [isReady]);

  const fileInputRef = useRef(null);

  const customModules = React.useMemo(() => {
    if (!modules) return null;
    const mods = { ...modules };
    if (mods.toolbar && Array.isArray(mods.toolbar)) {
      const imageGroup = mods.toolbar.find(group => Array.isArray(group) && group.includes('image'));
      if (imageGroup && !imageGroup.includes('image-settings')) {
        imageGroup.push('image-settings');
      }
    }
    mods.toolbar = {
      container: modules.toolbar,
      handlers: {
        image: function () {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        },
        'image-settings': function () {
          const quill = this.quill;
          const range = quill.getSelection();
          if (range) {
            const [leaf] = quill.getLeaf(range.index);
            if (leaf && leaf.domNode.tagName === 'IMG') {
              const img = leaf.domNode;
              const currentData = {
                alt: img.getAttribute("alt") || "",
                title: img.getAttribute("title") || ""
              };
              openAltModal(currentData, (newData) => {
                img.setAttribute("alt", newData.alt);
                img.setAttribute("title", newData.title);
                quill.setSelection(range);
              });
              return;
            }
          }
          showAlert("Vui lòng chọn một hình ảnh trước khi chỉnh sửa thuộc tính.");
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
        openAltModal({ alt: "", title: "" }, (newData) => {
          quill.insertEmbed(range.index, "image", {
            src: result.url,
            alt: newData.alt,
            title: newData.title
          }, "user");
          quill.setSelection(range.index + 1);
        });
      } else {
        showAlert("Lỗi tải ảnh");
      }
    } catch (error) {
      console.error(error);
      showAlert("Lỗi kết nối");
    } finally {
      e.target.value = "";
    }
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const img = selectedImageRef.current;
    if (!img) return;

    const startX = e.clientX;
    const startWidth = img.clientWidth;
    const containerWidth = containerRef.current.clientWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = direction.includes('right') ? startWidth + deltaX : startWidth - deltaX;
      
      newWidth = Math.max(50, Math.min(newWidth, containerWidth));
      
      img.style.width = `${newWidth}px`;
      img.style.height = 'auto';
      
      if (resizerOverlayRef.current) {
        const imgRect = img.getBoundingClientRect();
        const wrapperRect = containerRef.current.getBoundingClientRect();
        resizerOverlayRef.current.style.top = `${imgRect.top - wrapperRect.top}px`;
        resizerOverlayRef.current.style.left = `${imgRect.left - wrapperRect.left}px`;
        resizerOverlayRef.current.style.width = `${imgRect.width}px`;
        resizerOverlayRef.current.style.height = `${imgRect.height}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      const finalPixelWidth = img.clientWidth;
      const percentageWidth = Math.round((finalPixelWidth / containerWidth) * 100);
      img.style.width = `${percentageWidth}%`;
      img.setAttribute('width', `${percentageWidth}%`);
      
      updateResizerRect();
      
      const quill = editorRef.current?.getEditor();
      const currentImg = selectedImageRef.current;
      if (quill && currentImg) {
        const blot = Quill.find(currentImg);
        if (blot) {
          const index = quill.getIndex(blot);
          quill.setSelection(index, 1, 'user');
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const renderModals = () => {
    if (!isMounted) return null;
    return (
      <>
        <Modal 
          isOpen={alertConfig.isOpen} 
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          title="Thông báo"
          maxWidth="max-w-sm"
        >
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">{alertConfig.message}</p>
            <Button
              onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
              className="w-full py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-blue-100"
            >
              Đã hiểu
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thông tin hình ảnh"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Mô tả ảnh</label>
              <Input
                size="lg"
                autoFocus
                placeholder="Ví dụ: Không gian phòng học hiện đại..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.alt}
                onChange={(e) => setModalData({ ...modalData, alt: e.target.value, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-50 hover:text-red-500 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <Button
                type="button"
                onClick={() => handleModalSubmit()}
                className="flex-1 px-6 py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div className="quill-wrapper-container relative" ref={containerRef}>
      {renderModals()}

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
        .ql-editor img {
          cursor: pointer;
          transition: border-color 0.2s ease;
          border: 4px solid transparent;
          display: inline-block;
          max-width: 100%;
        }
        .ql-editor img:hover {
          border-color: rgba(26, 148, 255, 0.3);
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
            font-family: '${font.family}', sans-serif !important;
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
        .resizer-handle {
          position: absolute;
          width: 24px;
          height: 24px;
          background: white;
          border: 2px solid #1A94FF;
          border-radius: 50%;
          pointer-events: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 2001;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .resizer-handle:hover {
          transform: scale(1.1);
          background: #f0f7ff;
        }
      `}</style>

      {resizerRect && (
        <div 
          ref={resizerOverlayRef}
          className="absolute"
          style={{
            top: resizerRect.top,
            left: resizerRect.left,
            width: resizerRect.width,
            height: resizerRect.height,
            border: '2px solid #1A94FF',
            boxShadow: '0 0 10px rgba(26, 148, 255, 0.3)',
            pointerEvents: 'none',
            zIndex: 2000,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { dir: 'top-left', cursor: 'nwse-resize', style: { top: -12, left: -12 } },
            { dir: 'top-right', cursor: 'nesw-resize', style: { top: -12, right: -12 } },
            { dir: 'bottom-left', cursor: 'nesw-resize', style: { bottom: -12, left: -12 } },
            { dir: 'bottom-right', cursor: 'nwse-resize', style: { bottom: -12, right: -12 } }
          ].map((handle) => (
            <div 
              key={handle.dir}
              className="resizer-handle"
              style={{ ...handle.style, cursor: handle.cursor }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleResizeStart(e, handle.dir);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

QuillWrapper.displayName = "QuillWrapper";
export default QuillWrapper;
