import React, { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Typography, Button } from "@material-tailwind/react";
import { MdSave, MdClose, MdCloudUpload, MdArticle, MdCategory, MdVisibility, MdPerson } from "react-icons/md";
import Cropper from "react-easy-crop";
import { showToastError } from "@/helpers/toast";

const QuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);

import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const pendingQuillMounts = [];
let quillMountInProgress = false;

const flushQuillMountQueue = () => {
  if (quillMountInProgress || pendingQuillMounts.length === 0) return;

  quillMountInProgress = true;
  const mountNext = pendingQuillMounts.shift();

  window.setTimeout(() => {
    mountNext?.();
    window.setTimeout(() => {
      quillMountInProgress = false;
      flushQuillMountQueue();
    }, 350);
  }, 0);
};

const enqueueQuillMount = (mount) => {
  pendingQuillMounts.push(mount);
  flushQuillMountQueue();

  return () => {
    const index = pendingQuillMounts.indexOf(mount);
    if (index >= 0) pendingQuillMounts.splice(index, 1);
  };
};

const getPlainText = (html) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const toCssUnit = (value, allowNegative = false) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/p$/i.test(text) && !/px$/i.test(text)) return "";
  const pattern = allowNegative
    ? /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
    : /^(?:\d+(?:\.\d+)?|\.\d+)$/;
  return pattern.test(text) ? `${text}px` : text;
};

const stripCssUnit = (value) => String(value || "").trim().replace(/px$/i, "");

const extractResponsiveControls = (html) => {
  const empty = {
    fontSize: "",
    fontSizeMobile: "",
    lineHeight: "",
    lineHeightMobile: "",
    translateY: "",
    translateYMobile: "",
  };
  if (!html || typeof window === "undefined") return empty;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const styled = doc.body.firstElementChild?.querySelector("[style*='--fs'], [style*='--custom-line-height'], [style*='--translate-y']");
  if (!styled) return empty;

  return {
    fontSize: stripCssUnit(styled.style.getPropertyValue("--fs-desktop")),
    fontSizeMobile: stripCssUnit(styled.style.getPropertyValue("--fs-mobile")),
    lineHeight: stripCssUnit(styled.style.getPropertyValue("--custom-line-height")),
    lineHeightMobile: stripCssUnit(styled.style.getPropertyValue("--custom-line-height-mobile")),
    translateY: stripCssUnit(styled.style.getPropertyValue("--translate-y")),
    translateYMobile: stripCssUnit(styled.style.getPropertyValue("--translate-y-mobile")),
  };
};

const decorateRichTextWithControls = (html, controls = {}) => {
  if (!html || typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  let targets = Array.from(root.children).filter((node) => node instanceof HTMLElement);
  if (targets.length === 0) {
    const p = doc.createElement("p");
    p.innerHTML = root.innerHTML;
    root.innerHTML = "";
    root.appendChild(p);
    targets = [p];
  }

  const entries = [
    ["--fs-desktop", toCssUnit(controls.fontSize)],
    ["--fs-mobile", toCssUnit(controls.fontSizeMobile)],
    ["--custom-line-height", toCssUnit(controls.lineHeight)],
    ["--custom-line-height-mobile", toCssUnit(controls.lineHeightMobile)],
    ["--translate-y", toCssUnit(controls.translateY, true)],
    ["--translate-y-mobile", toCssUnit(controls.translateYMobile, true)],
  ];

  targets.forEach((target) => {
    target.setAttribute("data-rich-text-controls", "true");
    entries.forEach(([name, value]) => {
      if (value) {
        target.style.setProperty(name, value);
      } else {
        target.style.removeProperty(name);
      }
    });
  });

  return root.innerHTML;
};

function LazyQuillWrapper({ minHeight = "120px", ...props }) {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = React.useRef(null);
  const cancelQueuedMountRef = React.useRef(null);

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    if (!node || typeof window === "undefined") return;

    const renderNow = () => {
      if (cancelQueuedMountRef.current) return;
      cancelQueuedMountRef.current = enqueueQuillMount(() => {
        setShouldRender(true);
      });
    };

    const frameId = window.requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < viewportHeight + 160 && rect.bottom > -160) {
        renderNow();
      }
    });

    if (!("IntersectionObserver" in window)) {
      renderNow();
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          renderNow();
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "160px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
      cancelQueuedMountRef.current?.();
      cancelQueuedMountRef.current = null;
    };
  }, [shouldRender]);

  const previewText = getPlainText(props.value);

  return (
    <div ref={containerRef}>
      {shouldRender ? (
        <QuillWrapper minHeight={minHeight} {...props} />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (cancelQueuedMountRef.current) return;
            cancelQueuedMountRef.current = enqueueQuillMount(() => {
              setShouldRender(true);
            });
          }}
          className="block w-full rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-left text-sm text-gray-700 transition-colors hover:border-primary/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ minHeight }}
        >
          {previewText ? (
            <span className="line-clamp-5">{previewText}</span>
          ) : (
            <span className="text-gray-400">{props.placeholder || "Nhap noi dung..."}</span>
          )}
        </button>
      )}
    </div>
  );
}

const DraftTextField = React.memo(function DraftTextField({
  value = "",
  onCommit,
  className,
  textarea = false,
  rows = 2,
  commitOnEnter = true,
  ...props
}) {
  const [draft, setDraft] = useState(value || "");
  const focusedRef = useRef(false);
  const lastCommittedRef = useRef(value || "");

  useEffect(() => {
    const nextValue = value || "";
    lastCommittedRef.current = nextValue;
    if (!focusedRef.current) {
      setDraft(nextValue);
    }
  }, [value]);

  const commit = useCallback(() => {
    focusedRef.current = false;
    if (draft !== lastCommittedRef.current) {
      lastCommittedRef.current = draft;
      onCommit?.(draft);
    }
  }, [draft, onCommit]);

  const sharedProps = {
    ...props,
    value: draft,
    className,
    onFocus: (event) => {
      focusedRef.current = true;
      props.onFocus?.(event);
    },
    onChange: (event) => {
      setDraft(event.target.value);
      props.onChange?.(event);
    },
    onBlur: (event) => {
      commit();
      props.onBlur?.(event);
    },
    onKeyDown: (event) => {
      if (commitOnEnter && event.key === "Enter" && !event.shiftKey && !textarea) {
        event.currentTarget.blur();
      }
      props.onKeyDown?.(event);
    },
  };

  return textarea ? <textarea {...sharedProps} rows={rows} /> : <input {...sharedProps} />;
}, (prevProps, nextProps) => (
  prevProps.value === nextProps.value &&
  prevProps.className === nextProps.className &&
  prevProps.placeholder === nextProps.placeholder &&
  prevProps.type === nextProps.type &&
  prevProps.textarea === nextProps.textarea &&
  prevProps.rows === nextProps.rows &&
  prevProps.commitOnEnter === nextProps.commitOnEnter
));

const getCroppedImg = (imageSrc, croppedAreaPixels) => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.src = imageSrc;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("No 2d context"));
        return;
      }

      // Set canvas size to the cropped area
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Export as blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", 0.95);
    };
    image.onerror = (error) => reject(error);
  });
};

export default function BlogForm({ data, onSave, onCancel, isPage = false }) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      let isScrolled = window.scrollY > 300;
      if (!isScrolled) {
        const scrollable = document.querySelector("main, .overflow-y-auto");
        if (scrollable) {
          isScrolled = scrollable.scrollTop > 300;
        }
      }
      setShowScrollTop(isScrolled);
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollContainers = document.querySelectorAll("main, .overflow-y-auto, #root, body");
    scrollContainers.forEach((el) => {
      el.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const titleControls = extractResponsiveControls(data?.title || "");
  const excerptControls = extractResponsiveControls(data?.excerpt || "");
  const contentControls = extractResponsiveControls(data?.content || "");
  const [formData, setFormData] = useState({
    title: "",
    category: "kien-thuc",
    status: 1,
    excerpt: "",
    content: "",
    thumbnail: "",
    authorName: "Hoa Học Trò",
    authorAvatar: "",
    ...data,
    titleFontSize: data?.titleFontSize || titleControls.fontSize || "",
    titleFontSizeMobile: data?.titleFontSizeMobile || titleControls.fontSizeMobile || "",
    titleLineHeight: titleControls.lineHeight || data?.lineHeight || "",
    titleLineHeightMobile: titleControls.lineHeightMobile || data?.lineHeightMobile || "",
    titleTranslateY: titleControls.translateY || data?.translateY || "",
    titleTranslateYMobile: titleControls.translateYMobile || data?.translateYMobile || "",
    excerptFontSize: data?.excerptFontSize || excerptControls.fontSize || "",
    excerptFontSizeMobile: data?.excerptFontSizeMobile || excerptControls.fontSizeMobile || "",
    excerptLineHeight: excerptControls.lineHeight || data?.excerptLineHeight || "",
    excerptLineHeightMobile: excerptControls.lineHeightMobile || data?.excerptLineHeightMobile || "",
    excerptTranslateY: excerptControls.translateY || data?.excerptTranslateY || "",
    excerptTranslateYMobile: excerptControls.translateYMobile || data?.excerptTranslateYMobile || "",
    fontSize: data?.fontSize || contentControls.fontSize || "",
    fontSizeMobile: data?.fontSizeMobile || contentControls.fontSizeMobile || "",
    lineHeight: data?.lineHeight || contentControls.lineHeight || "",
    lineHeightMobile: data?.lineHeightMobile || contentControls.lineHeightMobile || "",
    translateY: data?.translateY || contentControls.translateY || "",
    translateYMobile: data?.translateYMobile || contentControls.translateYMobile || "",
  });
  const quillDraftsRef = useRef({});

  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  // States for Image Cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    if (formData.thumbnail && !formData.thumbnail.startsWith("blob:")) {
      setPreviewImage(formData.thumbnail.startsWith("http") ? formData.thumbnail : `${URL_API}${formData.thumbnail.replace(/\\/g, "/").replace(/^\/+/, "")}`);
    }
    if (formData.authorAvatar && !formData.authorAvatar.startsWith("blob:")) {
      setPreviewAvatar(formData.authorAvatar.startsWith("http") ? formData.authorAvatar : `${URL_API}${formData.authorAvatar.replace(/\\/g, "/").replace(/^\/+/, "")}`);
    }
  }, [formData.thumbnail, formData.authorAvatar]);

  const [categories, setCategories] = useState([]);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    fetch(`${URL_API}api/blog/categories`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setCategories(res.data);
      })
      .catch(err => console.error("Lỗi tải danh mục:", err));
  }, []);

  const getCategoryLabel = (cat) => {
    if (cat === "kien-thuc") return "Kiến thức";
    if (cat === "kinh-nghiem") return "Kinh nghiệm";
    if (!cat) return "";
    return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " ");
  };

  const handleCategoryCommit = useCallback((value) => {
    setFormData(prev => ({ ...prev, category: value }));
  }, []);

  const handleAuthorNameCommit = useCallback((value) => {
    setFormData(prev => ({ ...prev, authorName: value }));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImageSrc(null);
  };

  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      setAvatarFile(croppedFile);
      setPreviewAvatar(URL.createObjectURL(croppedBlob));
      setShowCropper(false);
    } catch (error) {
      console.error("Lỗi cắt ảnh:", error);
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCropImageSrc(URL.createObjectURL(file));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    }
  };

  const updateRichField = (field, value) => {
    quillDraftsRef.current[field] = value;
  };

  const commitRichField = (field, value) => {
    quillDraftsRef.current[field] = value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentFormData = { ...formData, ...quillDraftsRef.current };
    if (!currentFormData.title || !getPlainText(currentFormData.title).trim()) {
      showToastError("Vui lòng nhập tiêu đề bài viết.");
      return;
    }
    const submitData = {
      ...currentFormData,
      title: decorateRichTextWithControls(currentFormData.title, {
        fontSize: currentFormData.titleFontSize,
        fontSizeMobile: currentFormData.titleFontSizeMobile,
        lineHeight: currentFormData.titleLineHeight,
        lineHeightMobile: currentFormData.titleLineHeightMobile,
        translateY: currentFormData.titleTranslateY,
        translateYMobile: currentFormData.titleTranslateYMobile,
      }),
      excerpt: getPlainText(currentFormData.excerpt) ? decorateRichTextWithControls(currentFormData.excerpt, {
        fontSize: currentFormData.excerptFontSize,
        fontSizeMobile: currentFormData.excerptFontSizeMobile,
        lineHeight: currentFormData.excerptLineHeight,
        lineHeightMobile: currentFormData.excerptLineHeightMobile,
        translateY: currentFormData.excerptTranslateY,
        translateYMobile: currentFormData.excerptTranslateYMobile,
      }) : "",
      content: decorateRichTextWithControls(currentFormData.content, {
        fontSize: currentFormData.fontSize,
        fontSizeMobile: currentFormData.fontSizeMobile,
        lineHeight: currentFormData.lineHeight,
        lineHeightMobile: currentFormData.lineHeightMobile,
        translateY: currentFormData.translateY,
        translateYMobile: currentFormData.translateYMobile,
      }),
    };
    if (imageFile) {
      submitData.thumbnailFile = imageFile;
    }
    if (avatarFile) {
      submitData.avatarFile = avatarFile;
    }
    onSave(submitData);
  };

  return (
    <form
      id="blog-form"
      onSubmit={handleSubmit}
      className={isPage ? "space-y-6 py-2" : "space-y-6 max-h-[85vh] overflow-y-auto px-3 sm:px-6 py-4 custom-scrollbar"}
    >
      <div className="w-full bg-white p-6 md:p-8 rounded-2xl border border-gray-300 shadow-sm space-y-6">
        {/* Hàng 1: Tiêu đề */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MdArticle className="text-primary h-5 w-5" />
            <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
              Tiêu đề bài viết
            </Typography>
          </div>
          <div className="border border-gray-200 rounded-2xl overflow-visible bg-white shadow-sm ring-1 ring-black/5">
            <LazyQuillWrapper
              theme="snow"
              value={formData.title}
              onChange={(val) => commitRichField("title", val)}
              onDraftChange={(val) => updateRichField("title", val)}
              onBlur={(val) => commitRichField("title", val)}
              className="min-h-[80px]"
              minHeight="80px"
              maxHeight="150px"
              placeholder="Nhập tiêu đề ấn tượng cho bài viết…"
              disableImageWrap={true}
              lineHeight={formData.titleLineHeight}
              lineHeightMobile={formData.titleLineHeightMobile}
              fontSize={formData.titleFontSize}
              fontSizeMobile={formData.titleFontSizeMobile}
              translateY={formData.titleTranslateY}
              translateYMobile={formData.titleTranslateYMobile}
              onChangeLineHeight={(val) => setFormData(prev => ({ ...prev, titleLineHeight: val }))}
              onChangeLineHeightMobile={(val) => setFormData(prev => ({ ...prev, titleLineHeightMobile: val }))}
              onChangeFontSize={(val) => setFormData(prev => ({ ...prev, titleFontSize: val }))}
              onChangeFontSizeMobile={(val) => setFormData(prev => ({ ...prev, titleFontSizeMobile: val }))}
              onChangeTranslateY={(val) => setFormData(prev => ({ ...prev, titleTranslateY: val }))}
              onChangeTranslateYMobile={(val) => setFormData(prev => ({ ...prev, titleTranslateYMobile: val }))}
              hasResponsiveFontSize={true}
              commitOnBlurOnly={true}
            />
          </div>
        </div>

        {/* Hàng 2: Các cấu hình nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chuyên mục */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MdCategory className="text-primary h-5 w-5" />
              <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                Chuyên mục
              </Typography>
            </div>
            {!isAddingNew ? (
              <div className="flex gap-2">
                <select
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-300 focus:border-primary outline-none text-sm text-foreground font-medium bg-white transition-all duration-300 shadow-sm appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                  {formData.category && !categories.includes(formData.category) && (
                    <option value={formData.category}>
                      {getCategoryLabel(formData.category)}
                    </option>
                  )}
                </select>
                <Button 
                  size="sm"
                  variant="outlined" 
                  className="rounded-xl border-gray-300 text-gray-700 font-bold px-4"
                  onClick={() => setIsAddingNew(true)}
                  type="button"
                >
                  + Mới
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <DraftTextField
                  type="text"
                  placeholder="Nhập chuyên mục mới..."
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-300 focus:border-primary outline-none text-sm text-foreground font-medium bg-white transition-all duration-300 shadow-sm"
                  value={formData.category}
                  onCommit={handleCategoryCommit}
                />
                <Button 
                  size="sm"
                  variant="text" 
                  className="rounded-xl text-red-500 font-bold px-4"
                  onClick={() => setIsAddingNew(false)}
                  type="button"
                >
                  Hủy
                </Button>
              </div>
            )}
          </div>

          {/* Trạng thái */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MdVisibility className="text-primary h-5 w-5" />
              <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                Trạng thái hiển thị
              </Typography>
            </div>
            <select
              className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary outline-none text-sm text-foreground font-medium bg-white transition-all duration-300 shadow-sm appearance-none"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) })}
            >
              <option value={1}>Công khai</option>
              <option value={0}>Bản nháp</option>
            </select>
          </div>

          {/* Tên tác giả */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MdPerson className="text-primary h-5 w-5" />
              <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                Tên tác giả
              </Typography>
            </div>
            <DraftTextField
              type="text"
              placeholder="Tên tác giả..."
              className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary outline-none text-sm text-foreground font-medium bg-white transition-all duration-300 shadow-sm"
              value={formData.authorName}
              onCommit={handleAuthorNameCommit}
            />
          </div>
        </div>

        {/* Hàng 3: Excerpt, Ảnh bìa & Ảnh tác giả */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <MdArticle className="text-primary h-5 w-5 rotate-90" />
              <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                Tóm tắt ngắn
              </Typography>
            </div>
            <div className="border border-gray-200 rounded-2xl overflow-visible bg-white shadow-sm ring-1 ring-black/5">
              <LazyQuillWrapper
                theme="snow"
                value={formData.excerpt}
                onChange={(val) => commitRichField("excerpt", val)}
                onDraftChange={(val) => updateRichField("excerpt", val)}
                onBlur={(val) => commitRichField("excerpt", val)}
                className="min-h-[120px]"
                minHeight="120px"
                maxHeight="200px"
                placeholder="Mô tả ngắn gọn nội dung bài viết..."
                disableImageWrap={true}
                lineHeight={formData.excerptLineHeight}
                lineHeightMobile={formData.excerptLineHeightMobile}
                fontSize={formData.excerptFontSize}
                fontSizeMobile={formData.excerptFontSizeMobile}
                translateY={formData.excerptTranslateY}
                translateYMobile={formData.excerptTranslateYMobile}
                onChangeLineHeight={(val) => setFormData(prev => ({ ...prev, excerptLineHeight: val }))}
                onChangeLineHeightMobile={(val) => setFormData(prev => ({ ...prev, excerptLineHeightMobile: val }))}
                onChangeFontSize={(val) => setFormData(prev => ({ ...prev, excerptFontSize: val }))}
                onChangeFontSizeMobile={(val) => setFormData(prev => ({ ...prev, excerptFontSizeMobile: val }))}
                onChangeTranslateY={(val) => setFormData(prev => ({ ...prev, excerptTranslateY: val }))}
                onChangeTranslateYMobile={(val) => setFormData(prev => ({ ...prev, excerptTranslateYMobile: val }))}
                hasResponsiveFontSize={true}
                commitOnBlurOnly={true}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
              Ảnh bìa & Ảnh tác giả
            </Typography>
            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
              💡 Ảnh bìa khuyên dùng: 1200 x 800px (tỷ lệ 3:2).<br />
              💡 Ảnh tác giả khuyên dùng: 200 x 200px (tỷ lệ 1:1, ảnh vuông).
            </p>
            <div className="flex gap-4">
              {/* Ảnh đại diện bài viết */}
              <label htmlFor="thumbnail-upload" className="relative w-28 h-20 overflow-hidden border-2 border-dashed border-gray-300 rounded-none bg-gray-50 flex items-center justify-center cursor-pointer group">
                {previewImage ? (
                  <>
                    <img src={previewImage} alt="Xem trước ảnh bìa" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">Thay ảnh</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <MdCloudUpload className="h-5 w-5 text-gray-400" />
                    <span className="text-[8px] font-bold text-gray-500 uppercase mt-1">Ảnh bìa</span>
                  </div>
                )}
                <input id="thumbnail-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>

              {/* Ảnh đại diện tác giả */}
              <label htmlFor="avatar-upload" className="relative w-20 h-20 rounded-full overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer group">
                {previewAvatar ? (
                  <>
                    <img src={previewAvatar} alt="Xem trước ảnh tác giả" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">Thay ảnh</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <MdPerson className="h-5 w-5 text-gray-400" />
                    <span className="text-[8px] font-bold text-gray-500 uppercase mt-1">Ảnh tác giả</span>
                  </div>
                )}
                <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
        </div>

        {/* Đường chia cách phần nội dung */}
        <div className="border-t border-gray-200/80 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <MdArticle className="text-primary h-5 w-5" />
            <Typography variant="small" className="text-navy-700 font-bold uppercase tracking-wider text-[11px]">
              Nội dung bài viết chi tiết
            </Typography>
          </div>
          <div className="w-full blog-content-area bg-white rounded-xl">
            <div className="border border-gray-200 rounded-2xl overflow-visible bg-white shadow-sm ring-1 ring-black/5">
              <LazyQuillWrapper
                theme="snow"
                value={formData.content}
                onChange={(val) => commitRichField("content", val)}
                onDraftChange={(val) => updateRichField("content", val)}
                onBlur={(val) => commitRichField("content", val)}
                className="blog-desc-editor"
                minHeight="180px"
                maxHeight="520px"
                isBlogEditor={true}
                lineHeight={formData.lineHeight}
                lineHeightMobile={formData.lineHeightMobile}
                fontSize={formData.fontSize}
                fontSizeMobile={formData.fontSizeMobile}
                translateY={formData.translateY}
                translateYMobile={formData.translateYMobile}
                onChangeLineHeight={(val) => setFormData(prev => ({ ...prev, lineHeight: val }))}
                onChangeLineHeightMobile={(val) => setFormData(prev => ({ ...prev, lineHeightMobile: val }))}
                onChangeFontSize={(val) => setFormData(prev => ({ ...prev, fontSize: val }))}
                onChangeFontSizeMobile={(val) => setFormData(prev => ({ ...prev, fontSizeMobile: val }))}
                onChangeTranslateY={(val) => setFormData(prev => ({ ...prev, translateY: val }))}
                onChangeTranslateYMobile={(val) => setFormData(prev => ({ ...prev, translateYMobile: val }))}
                hasResponsiveFontSize={true}
                inlineSelectionControls={true}
                commitOnBlurOnly={true}
              />
            </div>
          </div>
        </div>

        {/* Cấu hình nút lưu ở dưới cùng */}
        <div className="hidden">
          <button 
            type="button"
            onClick={onCancel} 
            className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
          >
            <MdClose className="h-5 w-5" />
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            className="hidden"
          >
            <MdSave className="h-5 w-5" />
            Lưu bài viết ngay
          </button>
        </div>
      </div>
      <div className="fixed bottom-8 right-8 z-[9998] flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-600 shadow-xl shadow-slate-900/10 ring-1 ring-gray-200 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-2xl active:scale-95"
          aria-label="Hủy bỏ"
        >
          <MdClose className="h-5 w-5" />
          <span className="hidden sm:inline">Hủy bỏ</span>
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xl shadow-green-900/15 transition-all hover:bg-green-700 hover:shadow-2xl active:scale-95"
          aria-label="Lưu bài viết"
        >
          <MdSave className="h-5 w-5" />
          <span className="hidden sm:inline">Lưu bài viết</span>
        </button>
      </div>
      {/* Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCropCancel} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl z-10 overflow-hidden border border-gray-100 flex flex-col h-[500px]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Cắt ảnh đại diện</h3>
              <button type="button" onClick={handleCropCancel} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-red-500">
                <MdClose className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative flex-1 bg-gray-900 overflow-hidden">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Thu phóng</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all active:scale-95 shadow-md shadow-green-100"
                >
                  Cắt và Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-8 z-[9999] p-3 rounded-full bg-primary hover:bg-green-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 flex items-center justify-center"
          aria-label="Cuộn lên đầu trang"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      )}
    </form>
  );
}
