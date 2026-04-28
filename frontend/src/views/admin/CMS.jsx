"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd,
  MdDelete,
  MdSave,
  MdClose,
  MdArticle,
  MdDesignServices,
  MdPhotoLibrary,
  MdRssFeed,
  MdQuestionAnswer,
  MdSettings,
} from "react-icons/md";
import dynamic from "next/dynamic";
import { Input, Textarea, Typography } from "@material-tailwind/react";
import { handleInvalidToken } from "../../utils/helpers";
import { showToastSuccess, showToastError } from "../../helpers/toast";
import fetchData from "../../axios";
import Loading from "../../components/admin/loading";
import ColorPicker from "../../components/admin/color-picker";

const FONTS = [
  "roboto", "playfair-display", "montserrat", "poppins",
  "raleway", "dancing-script", "pacifico", "amatic-sc", "bebas-neue",
  "syncopate", "great-vibes", "pinyon-script", "alex-brush", "parisienne",
  "tangerine", "satisfy", "caveat", "oswald", "lato", "nunito", "quicksand",
  "arial", "times-new-roman", "serif", "monospace", "inter", "iciel-amber"
];

const ReactQuill = dynamic(
  () => import("./QuillWrapper"),
  { ssr: false }
);

import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [false, ...FONTS] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header", "font", "size",
  "bold", "italic", "underline", "strike",
  "color", "background",
  "list", "align",
];

const SECTIONS = [
  { id: "about", label: "Giới thiệu", icon: MdArticle },
  { id: "services", label: "Dịch vụ & Tiện ích", icon: MdDesignServices },
  { id: "gallery", label: "Không gian", icon: MdPhotoLibrary },
  { id: "blog", label: "Blog & Tin tức", icon: MdRssFeed },
  { id: "product_detail", label: "Chi tiết phòng", icon: MdArticle },
  { id: "general", label: "Cấu hình chung", icon: MdSettings },
];

const SECTION_KEY_MAP = {
  about: ["describe-heading", "seo-h1-main", "describe-h2", "bgTitle", "textDecription"],
  services: ["room-heading", "amenities-content", "amenities-description"],
  gallery: ["gallery-heading"],
  blog: ["blog-heading"],
};

const KEY_LABEL_MAP = {
  "describe-heading": "Tiêu đề nghệ thuật chính (H1)",
  "seo-h1-main": "Phòng Học Cho Thuê / Tiêu đề SEO (H1)",
  "describe-h2": "Tiêu đề phụ dưới ảnh Đừng tìm đâu xa (H2)",
  textDecription: "Nội dung bài viết Giới thiệu",
  "room-heading": "Tiêu đề khu vực phòng học",
  "amenities-content": "Tiêu đề khu vực tiện ích",
  "amenities-description": "Đoạn văn mô tả tiện ích chi tiết",
  "gallery-heading": "Tiêu đề bộ sưu tập ảnh",
  "blog-heading": "Tiêu đề chuyên mục tin tức",
  "faq-heading": "Tiêu đề chuyên mục FAQ",
  bgTitle: "Ảnh trang trí nghệ thuật",
};

const TYPE_OPTIONS = [
  { value: "richtext", label: "Văn bản nghệ thuật (Word-like)" },
  { value: "text", label: "Văn bản thuần" },
  { value: "image", label: "Hình ảnh" },
  { value: "color", label: "Màu sắc" },
];

const EMPTY_NEW_CONFIG = { key: "", type: "richtext", section: "about", content: "" };

export default function CMS() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [activeSection, setActiveSection] = useState("about");
  const [openAdd, setOpenAdd] = useState(false);
  const [newConfig, setNewConfig] = useState(EMPTY_NEW_CONFIG);
  const [savingKey, setSavingKey] = useState(null);
  const [products, setProducts] = useState([]);
  const [savingProductId, setSavingProductId] = useState(null);

  const FONT_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Amatic+SC:wght@400;700&family=Bebas+Neue&family=Caveat:wght@400..700&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Inter:wght@400..700&family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400..900;1,400..900&family=Nunito:ital,wght@0,400..900;1,400..900&family=Oswald:wght@400..700&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,400;0,700;1,400;1,700&family=Quicksand:wght@400..700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Satisfy&family=Syncopate:wght@400;700&family=Tangerine:wght@400;700&display=swap');

    .ql-font-inter { font-family: 'Inter', sans-serif !important; }
    .ql-font-roboto { font-family: 'Roboto', sans-serif !important; }
    .ql-font-playfair-display { font-family: 'Playfair Display', serif !important; }
    .ql-font-montserrat { font-family: 'Montserrat', sans-serif !important; }
    .ql-font-poppins { font-family: 'Poppins', sans-serif !important; }
    .ql-font-raleway { font-family: 'Raleway', sans-serif !important; }
    .ql-font-dancing-script { font-family: 'Dancing Script', cursive !important; }
    .ql-font-pacifico { font-family: 'Pacifico', cursive !important; }
    .ql-font-amatic-sc { font-family: 'Amatic SC', cursive !important; }
    .ql-font-bebas-neue { font-family: 'Bebas Neue', sans-serif !important; }
    .ql-font-syncopate { font-family: 'Syncopate', sans-serif !important; }
    .ql-font-great-vibes { font-family: 'Great Vibes', cursive !important; }
    .ql-font-pinyon-script { font-family: 'Pinyon Script', cursive !important; }
    .ql-font-alex-brush { font-family: 'Alex Brush', cursive !important; }
    .ql-font-parisienne { font-family: 'Parisienne', cursive !important; }
    .ql-font-tangerine { font-family: 'Tangerine', cursive !important; }
    .ql-font-satisfy { font-family: 'Satisfy', cursive !important; }
    .ql-font-caveat { font-family: 'Caveat', cursive !important; }
    .ql-font-oswald { font-family: 'Oswald', sans-serif !important; }
    .ql-font-lato { font-family: 'Lato', sans-serif !important; }
    .ql-font-nunito { font-family: 'Nunito', sans-serif !important; }
    .ql-font-quicksand { font-family: 'Quicksand', sans-serif !important; }
    .ql-font-arial { font-family: Arial, sans-serif !important; }
    .ql-font-times-new-roman { font-family: 'Times New Roman', serif !important; }
    .ql-font-serif { font-family: serif !important; }
    .ql-font-monospace { font-family: monospace !important; }
    .ql-font-iciel-amber { font-family: 'iCiel Amber', sans-serif !important; }
    
    .ql-size-small { font-size: 0.85rem !important; }
    .ql-size-large { font-size: 2rem !important; }
    .ql-size-huge { font-size: 5rem !important; }

    .ql-editor {
      font-family: 'Inter', sans-serif;
    }

    .ql-editor h1 {
      font-size: 2.5rem !important;
      color: #563c39 !important;
      font-family: inherit !important;
    }
    .ql-editor h2 {
      font-size: 2rem !important;
      color: #563c39 !important;
      font-family: inherit !important;
    }
    .ql-snow .ql-picker.ql-font {
      width: 160px !important;
    }
    .ql-snow .ql-picker.ql-font .ql-picker-options {
      max-height: 250px;
      overflow-y: auto;
    }
    .ql-snow .ql-picker.ql-header {
      width: 100px !important;
    }
    .ql-snow .ql-picker.ql-font .ql-picker-label::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item::before { content: 'Mặc định'; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="inter"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="inter"]::before { content: 'Inter'; font-family: 'Inter', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="roboto"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="roboto"]::before { content: 'Roboto'; font-family: 'Roboto', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="playfair-display"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="playfair-display"]::before { content: 'Playfair Display'; font-family: 'Playfair Display', serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="montserrat"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="montserrat"]::before { content: 'Montserrat'; font-family: 'Montserrat', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="poppins"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="poppins"]::before { content: 'Poppins'; font-family: 'Poppins', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="raleway"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="raleway"]::before { content: 'Raleway'; font-family: 'Raleway', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="dancing-script"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="dancing-script"]::before { content: 'Dancing Script'; font-family: 'Dancing Script', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="pacifico"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="pacifico"]::before { content: 'Pacifico'; font-family: 'Pacifico', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="amatic-sc"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="amatic-sc"]::before { content: 'Amatic SC'; font-family: 'Amatic SC', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="bebas-neue"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="bebas-neue"]::before { content: 'Bebas Neue'; font-family: 'Bebas Neue', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="syncopate"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="syncopate"]::before { content: 'Syncopate'; font-family: 'Syncopate', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="great-vibes"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="great-vibes"]::before { content: 'Great Vibes'; font-family: 'Great Vibes', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="pinyon-script"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="pinyon-script"]::before { content: 'Pinyon Script'; font-family: 'Pinyon Script', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="alex-brush"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="alex-brush"]::before { content: 'Alex Brush'; font-family: 'Alex Brush', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="parisienne"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="parisienne"]::before { content: 'Parisienne'; font-family: 'Parisienne', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="tangerine"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="tangerine"]::before { content: 'Tangerine'; font-family: 'Tangerine', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="satisfy"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="satisfy"]::before { content: 'Satisfy'; font-family: 'Satisfy', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="caveat"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="caveat"]::before { content: 'Caveat'; font-family: 'Caveat', cursive; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="oswald"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="oswald"]::before { content: 'Oswald'; font-family: 'Oswald', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="lato"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="lato"]::before { content: 'Lato'; font-family: 'Lato', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nunito"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nunito"]::before { content: 'Nunito'; font-family: 'Nunito', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="quicksand"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="quicksand"]::before { content: 'Quicksand'; font-family: 'Quicksand', sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="arial"]::before { content: 'Arial'; font-family: Arial, sans-serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="times-new-roman"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="times-new-roman"]::before { content: 'Times New Roman'; font-family: 'Times New Roman', serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before { content: 'Serif'; font-family: serif; }
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before { content: 'Monospace'; font-family: monospace; }
  `;

  useEffect(() => {
    document.title = "Admin | Quản lý Giao diện";
    loadConfigs();
  }, []);

  useEffect(() => {
    if (activeSection === "product_detail") {
      loadProducts();
    }
  }, [activeSection]);

  useEffect(() => {
    const initSearch = () => {
      const pickers = document.querySelectorAll('.ql-font .ql-picker-options');
      pickers.forEach(picker => {
        if (!picker.querySelector('.font-search-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'font-search-wrapper';
          wrapper.innerHTML = '<input type="text" placeholder="Tìm kiếm font..." class="font-search-input" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;" />';
          wrapper.style.padding = '8px';
          wrapper.style.position = 'sticky';
          wrapper.style.top = '0';
          wrapper.style.backgroundColor = '#fff';
          wrapper.style.zIndex = '10';
          wrapper.style.borderBottom = '1px solid #f1f1f1';

          const input = wrapper.querySelector('input');
          input.onclick = (e) => e.stopPropagation();
          input.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') e.preventDefault();
          };
          input.onkeyup = (e) => {
            e.stopPropagation();
            const search = e.target.value.toLowerCase().replace(/[-_ ]/g, '');
            const items = picker.querySelectorAll('.ql-picker-item');
            items.forEach(item => {
              const rawVal = item.getAttribute('data-value') || 'macdinh';
              const val = rawVal.toLowerCase().replace(/[-_ ]/g, '');
              const label = item.textContent ? item.textContent.toLowerCase().replace(/[-_ ]/g, '') : '';
              if (val.includes(search) || label.includes(search) || rawVal === 'macdinh') {
                item.style.display = 'block';
              } else {
                item.style.display = 'none';
              }
            });
          };
          picker.insertBefore(wrapper, picker.firstChild);
        }
      });
    };

    const timeoutId = setInterval(initSearch, 1000);
    return () => clearInterval(timeoutId);
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await fetchData(`${URL_API}api/config?noCache=true`, "GET");
      setConfigs(res.data || []);
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") handleInvalidToken(router);
      showToastError("Không thể tải dữ liệu cấu hình");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetchData(`${URL_API}api/product`, "GET");
      const productsWithDefault = (res.data || []).map(p => ({
        ...p,
        name_rich: p.name_rich || `<h2>${p.name}</h2>`
      }));
      setProducts(productsWithDefault);
    } catch (error) {
      showToastError("Không thể tải danh sách phòng");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (key, value) => {
    setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, content: value } : c)));
  };

  const saveConfig = async (config) => {
    setSavingKey(config.key);
    const fd = new FormData();
    fd.append("content", config.content ?? "");
    fd.append("type", config.type);
    fd.append("section", config.section || activeSection);
    if (config.type === "image" && config._file) fd.append("content", config._file);
    try {
      await fetchData(`${URL_API}api/config/update/${config.key}`, "PUT", fd);
      showToastSuccess(`Đã lưu "${KEY_LABEL_MAP[config.key] || config.key}"`);
      loadConfigs();
    } catch {
      showToastError("Lưu thất bại, vui lòng thử lại");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteConfig = async (key) => {
    if (!window.confirm(`Xóa mục "${KEY_LABEL_MAP[key] || key}"?`)) return;
    try {
      await fetchData(`${URL_API}api/config/delete/${key}`, "DELETE");
      showToastSuccess("Đã xóa thành công");
      loadConfigs();
    } catch {
      showToastError("Xóa thất bại");
    }
  };

  const createConfig = async () => {
    if (!newConfig.key.trim()) return showToastError("Vui lòng nhập Key định danh");
    const fd = new FormData();
    Object.entries(newConfig).forEach(([k, v]) => fd.append(k, v));
    try {
      await fetchData(`${URL_API}api/config/store`, "POST", fd, {
        "Content-Type": "multipart/form-data",
      });
      showToastSuccess("Tạo mới thành công");
      setOpenAdd(false);
      setNewConfig(EMPTY_NEW_CONFIG);
      setActiveSection(newConfig.section);
      loadConfigs();
    } catch {
      showToastError("Tạo mới thất bại");
    }
  };
  const updateProductRichName = (id, value) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, name_rich: value } : p)));
  };

  const saveProductRichName = async (product) => {
    setSavingProductId(product.id);
    const data = {
      name_rich: product.name_rich || "",
      name: product.name,
    };

    try {
      await fetchData(`${URL_API}api/product/update/${product.id}`, "PUT", data);
      showToastSuccess(`Đã lưu tiêu đề cho "${product.name}"`);
      loadProducts();
    } catch {
      showToastError("Lưu thất bại");
    } finally {
      setSavingProductId(null);
    }
  };

  const getSectionConfigs = () => {
    const sectionKeys = SECTION_KEY_MAP[activeSection];
    return configs.filter((c) => {
      if (c.section && c.section !== "general" && c.section !== "default") {
        return c.section === activeSection;
      }
      if (sectionKeys) return sectionKeys.includes(c.key);
      return activeSection === "general";
    });
  };

  const renderEditor = (config, onContentChange) => {
    const keyLower = config.key.toLowerCase();
    const isRichText = config.type === "richtext" || keyLower.includes("decription") || keyLower.includes("description") || keyLower.includes("content");

    if (isRichText) {
      const isParagraph = (keyLower.includes("content") || keyLower.includes("description") || keyLower.includes("decription")) && config.key !== "amenities-content";
      const minHeight = isParagraph ? "300px" : "120px";
      return (
        <div className="border border-gray-100 rounded-xl transition-colors duration-200 bg-white">
          <ReactQuill
            ref={(el) => {
              if (el && el.getEditor) {
                const quill = el.getEditor();

                const Quill = quill.constructor;
                const Font = Quill.import("formats/font");
                const FontClass = Quill.import("attributors/class/font");
                Font.whitelist = [false, ...FONTS];
                FontClass.whitelist = [false, ...FONTS];
                Quill.register(Font, true);
                Quill.register(FontClass, true);

                const toolbar = quill.getModule('toolbar');

                const clipboard = quill.getModule('clipboard');
                if (clipboard && !clipboard.__patched) {
                  clipboard.addMatcher('SPAN', (node, delta) => {
                    const classes = node.getAttribute('class') || '';
                    const fontMatch = classes.match(/ql-font-([\w-]+)/);
                    if (fontMatch) {
                      const fontName = fontMatch[1];
                      const Delta = Quill.import('delta');
                      return delta.compose(new Delta().retain(delta.length(), { font: fontName }));
                    }
                    return delta;
                  });
                  clipboard.__patched = true;
                }

                if (toolbar && !toolbar.__patched) {
                  const originalUpdate = toolbar.update.bind(toolbar);
                  toolbar.update = function (range) {
                    if (range == null && quill.getLength() > 0) {
                      range = { index: 0, length: 0 };
                    }
                    originalUpdate(range);
                  };
                  toolbar.__patched = true;

                  quill.on('text-change', () => {
                    if (!quill.hasFocus()) {
                      setTimeout(() => toolbar.update(null), 10);
                    }
                  });
                }
              }
            }}
            theme="snow"
            value={config.content || ""}
            onChange={onContentChange}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            className={`quill-editor-${config.key}`}
          />
          <style jsx global>{`
            .quill-editor-${config.key} .ql-container,
            .quill-editor-${config.key} .ql-editor {
              min-height: ${minHeight};
              font-size: 16px;
            }
          `}</style>
        </div>
      );
    }

    if (config.type === "image") {
      return (
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setConfigs((prev) =>
                  prev.map((c) => (c.key === config.key ? { ...c, _file: file, content: URL.createObjectURL(file) } : c))
                );
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-lightPrimary file:text-primary hover:file:bg-green-100 transition-all cursor-pointer"
            />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Chấp nhận: .jpg, .png, .gif, .webp</p>
          </div>
          {config.content && (
            <div className="relative group shrink-0">
              <img
                src={config._file ? config.content : `${URL_API}${config.content.replace(/\\/g, "/")}`}
                alt="preview"
                className="h-28 w-auto object-contain rounded-xl border border-gray-100 shadow-sm"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <span className="text-white text-[10px] font-bold uppercase">Hiện tại</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (config.type === "color") {
      return (
        <div className="max-w-xs">
          <ColorPicker value={config.content || "#ffffff"} onChange={onContentChange} />
        </div>
      );
    }


    return (
      <Textarea
        value={config.content || ""}
        onChange={(e) => onContentChange(e.target.value)}
        rows={5}
        className="!border-gray-100 focus:!border-primary !rounded-xl text-navy-700"
        labelProps={{ className: "hidden" }}
      />
    );
  };

  const sectionConfigs = getSectionConfigs();

  return (
    <div className="h-full w-full p-2 md:p-4">
      <style jsx global>{FONT_STYLES}</style>
      <div className="mb-4 flex justify-end h-10">
        {/* Removed Add New Content Button */}
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-50 sticky top-[72px] z-30">
          <ul className="flex flex-row gap-1 overflow-x-auto scrollbar-hide p-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <li key={id} className="flex-none">
                  <button
                    onClick={() => setActiveSection(id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap
                      ${isActive
                        ? "bg-lightPrimary text-primary shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-navy-700"
                      }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-gray-400"}`} />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-sm border border-gray-50">
              <Loading />
            </div>
          ) : (sectionConfigs.length === 0 && activeSection !== "product_detail") ? (
            <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <MdSettings className="h-16 w-16 text-gray-100 mb-4" />
              <p className="text-gray-400 font-bold">Mục này chưa có nội dung cấu hình</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeSection === "product_detail" ? (
                products.map((product) => (
                  <div
                    key={`product-${product.id}`}
                    className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-visible hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50/10 border-b border-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-1 h-8 bg-orange-400 rounded-full" />
                        <div>
                          <p className="text-sm font-bold text-navy-700">
                            {product.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {renderEditor(
                        { key: `product-rich-name-${product.id}`, type: "richtext", content: product.name_rich },
                        (val) => updateProductRichName(product.id, val)
                      )}
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => saveProductRichName(product)}
                          disabled={savingProductId === product.id}
                          className="flex items-center justify-center gap-2 px-14 py-3 min-w-[200px] bg-primary text-white text-sm font-bold rounded-xl hover:bg-green-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-green-100"
                        >
                          {savingProductId === product.id ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MdSave className="h-5 w-5" />
                          )}
                          {savingProductId === product.id ? "Đang lưu..." : "Lưu dữ liệu"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                sectionConfigs.map((config) => (
                  <div
                    key={config.key}
                    className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-visible hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50/10 border-b border-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-1 h-8 bg-primary rounded-full" />
                        <div>
                          <p className="text-sm font-bold text-navy-700">
                            {KEY_LABEL_MAP[config.key] || config.key}
                          </p>
                        </div>
                      </div>
                      {/* Removed Delete Button */}
                    </div>

                    <div className="p-6">
                      {renderEditor(config, (val) => updateField(config.key, val))}
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => saveConfig(config)}
                          disabled={savingKey === config.key}
                          className="flex items-center justify-center gap-2 px-14 py-3 min-w-[200px] bg-primary text-white text-sm font-bold rounded-xl hover:bg-green-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-green-100"
                        >
                          {savingKey === config.key ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MdSave className="h-5 w-5" />
                          )}
                          {savingKey === config.key ? "Đang lưu..." : "Lưu dữ liệu"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Removed Add Modal */}
    </div>
  );
}
