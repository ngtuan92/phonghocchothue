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
  MdEdit,
} from "react-icons/md";
import dynamic from "next/dynamic";
import { Input, Textarea, Typography } from "@material-tailwind/react";
import { handleInvalidToken } from "../../utils/helpers";
import { showToastSuccess, showToastError } from "../../helpers/toast";
import fetchData from "../../axios";
import Loading from "../../components/admin/loading";
import ColorPicker from "../../components/admin/color-picker";

const QuillWrapper = dynamic(
  () => import("./QuillWrapper"),
  { ssr: false }
);

import "react-quill-new/dist/quill.snow.css";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/");

const SECTIONS = [
  { id: "about", label: "Giới thiệu", icon: MdArticle },
  { id: "services", label: "Dịch vụ & Tiện ích", icon: MdDesignServices },
  { id: "gallery", label: "Không gian", icon: MdPhotoLibrary },
  { id: "blog", label: "Blog & Tin tức", icon: MdRssFeed },
  { id: "faq", label: "FAQ", icon: MdQuestionAnswer },
  { id: "product_detail", label: "Chi tiết phòng", icon: MdArticle },
  { id: "general", label: "Cấu hình chung", icon: MdSettings },
];

const SECTION_KEY_MAP = {
  about: ["describe-heading", "describe-bg-text", "describe-phone", "seo-h1-main", "describe-h2", "bgTitle", "textDecription"],
  services: ["amenities-description"],
  gallery: ["gallery-heading", "room-heading"],
  faq: ["faq-heading", "faq_list"],
  blog: ["blog-page-title", "blog-page-description"],
};

const KEY_LABEL_MAP = {
  "describe-heading": "Tiêu đề nghệ thuật chính (H1)",
  "describe-bg-text": "Chữ nền nghệ thuật (Ví dụ: HOAHOCTRO)",
  "seo-h1-main": "Phòng Học Cho Thuê / Tiêu đề SEO (H1)",
  "describe-h2": "Tiêu đề phụ dưới ảnh Đừng tìm đâu xa (H2)",
  textDecription: "Nội dung bài viết Giới thiệu",
  "room-heading": "Tiêu đề khu vực phòng học",
  "amenities-content": "Tiêu đề khu vực tiện ích",
  "amenities-description": "Đoạn văn mô tả tiện ích chi tiết",
  "gallery-heading": "Tiêu đề bộ sưu tập ảnh",
  "blog-heading": "Tiêu đề chuyên mục tin tức (Home)",
  "blog-page-title": "Tiêu đề trang danh sách Blog",
  "blog-page-description": "Nội dung mô tả trang danh sách Blog",
  "faq-heading": "Tiêu đề chuyên mục FAQ (H2)",
  "faq_list": "Danh sách câu hỏi thường gặp (FAQ)",
  bgTitle: "Ảnh trang trí nghệ thuật",
  "describe-phone": "Số điện thoại phần giới thiệu (Hero)",
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
  const [sliders, setSliders] = useState([]);
  const [amenitySliders, setAmenitySliders] = useState([]);
  const [savingProductId, setSavingProductId] = useState(null);
  const [dynamicFonts, setDynamicFonts] = useState([]);

  const FONT_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Amatic+SC:wght@400;700&family=Bebas+Neue&family=Caveat:wght@400..700&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Inter:wght@400..700&family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400..900;1,400..900&family=Nunito:ital,wght@0,400..900;1,400..900&family=Oswald:wght@400..700&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,400;0,700;1,400;1,700&family=Quicksand:wght@400..700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Satisfy&family=Syncopate:wght@400;700&family=Tangerine:wght@400;700&display=swap');
    
    .ql-size-small { font-size: 0.85rem !important; }
    .ql-size-large { font-size: 2rem !important; }
    .ql-size-huge { font-size: 5rem !important; }
    .ql-size-super-huge { font-size: 15vw !important; line-height: 1 !important; font-weight: 900 !important; text-transform: uppercase !important; }

    .ql-editor {
      font-family: 'Inter', sans-serif;
    }

    .ql-editor h1 {
      font-size: 2.5rem !important;
      color: #563c39 !important;
    }
    .ql-editor h2 {
      font-size: 2rem !important;
      color: #563c39 !important;
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
    .ql-snow .ql-picker.ql-size {
      width: 130px !important;
    }
    
    .ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before,
    .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before { content: 'Normal'; }
    .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="small"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before { content: 'Small'; }
    .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before, .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before { content: 'Large'; }
    .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="huge"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before { content: 'Huge'; }
    .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="super-huge"]::before { 
      content: 'Super Huge'; 
      font-weight: bold;
      font-size: 3rem !important; 
    }

    .ql-snow .ql-picker.ql-size .ql-picker-label::before {
      font-size: 13px !important;
      font-weight: normal !important;
      text-transform: none !important;
      line-height: 24px !important;
    }

    .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="super-huge"]::before {
      content: 'Super Huge' !important;
    }

    .ql-snow .ql-picker.ql-size .ql-picker-options .ql-picker-item {
      padding: 10px !important;
      display: flex !important;
      align-items: center !important;
      height: auto !important;
      min-height: 35px;
    }
  `;

  useEffect(() => {
    document.title = "Admin | Quản lý Giao diện";
    loadConfigs();
    fetchFonts();
  }, []);

  const fetchFonts = async () => {
    try {
      const res = await fetch(`${URL_API}api/fonts`);
      if (res.ok) {
        const data = await res.json();
        setDynamicFonts(data);
        
        data.forEach(font => {
          if (font.url && font.url.startsWith('http')) {
            if (!document.getElementById(`font-${font.id}`)) {
              const link = document.createElement('link');
              link.id = `font-${font.id}`;
              link.href = font.url;
              link.rel = 'stylesheet';
              document.head.appendChild(link);
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeSection === "product_detail") {
      loadProducts();
    }
    if (activeSection === "gallery") {
      loadSliders("spaces");
    }
    if (activeSection === "services") {
      loadSliders("services");
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
              
              if (!item.__closeHandler) {
                item.addEventListener('click', (e) => {
                  const pickerRoot = item.closest('.ql-picker');
                  if (pickerRoot) pickerRoot.classList.remove('ql-expanded');
                });
                item.__closeHandler = true;
              }
            });
          };
          
          const styleId = 'quill-picker-flex-fix';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
              .ql-snow .ql-picker.ql-font.ql-expanded .ql-picker-options {
                display: flex !important;
                flex-direction: column !important;
              }
            `;
            document.head.appendChild(style);
          }

          wrapper.style.order = '-1'; 
          picker.appendChild(wrapper);
        }
      });
    };

    const timeoutId = setInterval(initSearch, 1000);
    return () => clearInterval(timeoutId);
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await fetchData(`${URL_API}api/config?noCache=true&t=${Date.now()}`, "GET");
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

  const loadSliders = async (type = "gallery") => {
    setIsLoading(true);
    try {
      const res = await fetchData(`${URL_API}api/slider?type=${type}&t=${Date.now()}`, "GET");
      if (type === "spaces") setSliders(res.data || []);
      else setAmenitySliders(res.data || []);
    } catch (error) {
      showToastError(`Không thể tải ảnh: ${error?.message || "Lỗi không xác định"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSliders = async (e, type = "spaces") => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsLoading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("name", file.name);
        formData.append("type", type);
        await fetchData(`${URL_API}api/slider/insert`, "POST", formData, {
          "Content-Type": "multipart/form-data",
        });
      }
      showToastSuccess(`Đã tải lên ${files.length} ảnh thành công`);
      loadSliders(type);
    } catch (error) {
      showToastError("Tải ảnh lên thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSlider = async (id, type = "spaces") => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này?")) return;
    setIsLoading(true);
    try {
      await fetchData(`${URL_API}api/slider/delete/${id}`, "DELETE");
      showToastSuccess("Xóa ảnh thành công");
      loadSliders(type);
    } catch (error) {
      showToastError("Xóa ảnh thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSlider = async (id, file, type = "spaces") => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await fetchData(`${URL_API}api/slider/update/${id}`, "PUT", formData, {
        "Content-Type": "multipart/form-data",
      });
      showToastSuccess("Cập nhật ảnh thành công");
      loadSliders(type);
    } catch (error) {
      showToastError("Cập nhật ảnh thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const onDragStart = (e, index, type) => {
    e.dataTransfer.setData("draggedIndex", index);
    e.dataTransfer.setData("draggedType", type);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = async (e, droppedIndex, type) => {
    const draggedIndex = parseInt(e.dataTransfer.getData("draggedIndex"));
    const draggedType = e.dataTransfer.getData("draggedType");
    if (draggedIndex === droppedIndex || draggedType !== type) return;

    const currentSliders = type === "spaces" ? [...sliders] : [...amenitySliders];
    const [draggedItem] = currentSliders.splice(draggedIndex, 1);
    currentSliders.splice(droppedIndex, 0, draggedItem);

    if (type === "spaces") setSliders(currentSliders);
    else setAmenitySliders(currentSliders);

    try {
      const orders = currentSliders.map((item, index) => ({
        id: item.id,
        position: index + 1
      }));
      await fetchData(`${URL_API}api/slider/reorder`, "POST", { orders });
      showToastSuccess("Đã lưu thứ tự mới");
    } catch (error) {
      showToastError("Lưu thứ tự thất bại");
      loadSliders(type);
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
    const filtered = configs.filter((c) => {
      // Loại bỏ faq_list và home-h1 khỏi Cấu hình chung vì đã có chỗ quản lý riêng
      if (activeSection === "general" && (c.key === "faq_list" || c.key === "home-h1")) {
        return false;
      }

      if (c.section && c.section !== "general" && c.section !== "default") {
        return c.section === activeSection;
      }
      if (sectionKeys) return sectionKeys.includes(c.key);
      return activeSection === "general";
    });

    if (sectionKeys) {
      return filtered.sort((a, b) => {
        const idxA = sectionKeys.indexOf(a.key);
        const idxB = sectionKeys.indexOf(b.key);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return filtered;
  };

  const renderEditor = (config, onContentChange) => {
    const keyLower = config.key.toLowerCase();
    const isRichText = config.type === "richtext" || keyLower.includes("decription") || keyLower.includes("description") || keyLower.includes("content");

    if (config.key === "faq_list") {
      let faqData = [];
      try {
        faqData = typeof config.content === 'string' ? JSON.parse(config.content || "[]") : (config.content || []);
      } catch (e) {
        faqData = [];
      }

      const updateFAQ = (index, field, value) => {
        const newData = [...faqData];
        newData[index][field] = value;
        onSaveInternal(JSON.stringify(newData));
      };

      const addFAQ = () => {
        const newData = [...faqData, { question: "", answer: "" }];
        onSaveInternal(JSON.stringify(newData));
      };

      const deleteFAQ = (index) => {
        if (!window.confirm("Xóa câu hỏi này?")) return;
        const newData = faqData.filter((_, i) => i !== index);
        onSaveInternal(JSON.stringify(newData));
      };

      const onSaveInternal = (val) => {
        setConfigs((prev) => prev.map((c) => (c.key === config.key ? { ...c, content: val } : c)));
      };

      return (
        <div className="space-y-6">
          {faqData.map((item, index) => (
            <div key={index} className="relative p-6 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-4">
              <button
                onClick={() => deleteFAQ(index)}
                className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Xóa câu hỏi"
              >
                <MdDelete size={20} />
              </button>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Câu hỏi {index + 1}</label>
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                    <style>{`
                      .faq-quill .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: #f9fafb; }
                      .faq-quill .ql-container.ql-snow { border: none !important; }
                    `}</style>
                    <QuillWrapper
                      theme="snow"
                      className="faq-quill"
                      value={item.question || ""}
                      onChange={(val) => updateFAQ(index, "question", val)}
                      placeholder="Nhập nội dung câu hỏi..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Câu trả lời {index + 1}</label>
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                    <QuillWrapper
                      theme="snow"
                      className="faq-quill"
                      value={item.answer || ""}
                      onChange={(val) => updateFAQ(index, "answer", val)}
                      placeholder="Nhập nội dung câu trả lời..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addFAQ}
            className="w-full py-4 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:border-primary hover:text-primary hover:bg-green-50/50 transition-all group"
          >
            <MdAdd className="h-6 w-6 transform group-hover:scale-110 transition-transform" />
            <span>Thêm câu hỏi mới</span>
          </button>
        </div>
      );
    }

    if (isRichText) {
      const isParagraph = (keyLower.includes("content") || keyLower.includes("description") || keyLower.includes("decription")) && config.key !== "amenities-content";
      const minHeight = isParagraph ? "300px" : "120px";
      return (
        <div className="border border-gray-100 rounded-xl transition-colors duration-200 bg-white">
          <QuillWrapper
            ref={(el) => {
              if (el && el.getEditor) {
                const quill = el.getEditor();
                if (quill) {
                  const toolbar = quill.getModule('toolbar');
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
              }
            }}
            theme="snow"
            value={config.content || ""}
            onChange={(val) => updateField(config.key, val)}
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

      <div className="flex flex-col gap-4">
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
          ) : (sectionConfigs.length === 0 && activeSection !== "product_detail" && activeSection !== "gallery" && activeSection !== "services") ? (
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

              {activeSection === "gallery" && (
                <div className="mt-10 pt-10 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-navy-700">Bộ sưu tập hình ảnh không gian phòng học</h3>
                      <p className="text-[10px] text-navy-700/60 font-bold uppercase tracking-wider">Slider hiển thị tại trang chủ</p>
                    </div>
                    <label className="cursor-pointer bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100">
                      <MdPhotoLibrary size={20} />
                      <span>Thêm ảnh mới</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleUploadSliders(e, "spaces")}
                        accept="image/*"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sliders.map((slider, index) => (
                      <div
                        key={slider.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, index, "spaces")}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, index, "spaces")}
                        className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 shadow-sm cursor-move hover:border-primary/30 transition-all duration-300"
                      >
                        <img
                          src={`${URL_API}${slider.image.replace(/\\/g, "/")}`}
                          alt={slider.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <label className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all transform hover:scale-110 cursor-pointer shadow-lg" title="Thay đổi ảnh">
                            <MdEdit size={20} />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleUpdateSlider(slider.id, e.target.files[0], "spaces")}
                              accept="image/*"
                            />
                          </label>
                          <button
                            onClick={() => handleDeleteSlider(slider.id, "spaces")}
                            className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all transform hover:scale-110 shadow-lg"
                            title="Xóa ảnh"
                          >
                            <MdDelete size={20} />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-lg text-gray-600 shadow-sm">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                    {sliders.length === 0 && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <MdPhotoLibrary size={32} className="text-gray-300 mb-2" />
                        <p className="text-gray-500 text-xs font-bold">Chưa có hình ảnh nào trong bộ sưu tập không gian</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "services" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden hover:shadow-md transition-shadow duration-300 mt-6">
                  <div className="px-6 py-4 bg-gray-50/10 border-b border-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-1 h-8 bg-primary rounded-full" />
                        <div>
                          <h3 className="text-sm font-bold text-navy-700">Bộ sưu tập ảnh Tiện ích & Dịch vụ</h3>
                          <p className="text-[10px] text-navy-700/60 font-bold uppercase tracking-wider">Hiển thị slider tại mục tiện ích</p>
                        </div>
                      </div>
                      <label className="cursor-pointer bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100">
                        <MdPhotoLibrary size={16} />
                        <span>Thêm ảnh mới</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleUploadSliders(e, "services")}
                          accept="image/*"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {amenitySliders.map((slider, index) => (
                        <div
                          key={slider.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, index, "services")}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, index, "services")}
                          className="group relative aspect-video rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 cursor-move hover:border-primary/30 transition-all duration-300"
                        >
                          <img
                            src={`${URL_API}${slider.image.replace(/\\/g, "/")}`}
                            alt={slider.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all cursor-pointer shadow-lg" title="Thay đổi ảnh">
                              <MdEdit size={16} />
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleUpdateSlider(slider.id, e.target.files[0], "services")}
                                accept="image/*"
                              />
                            </label>
                            <button
                              onClick={() => handleDeleteSlider(slider.id, "services")}
                              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                              title="Xóa ảnh"
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                          <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-[9px] font-bold px-1.5 py-0.5 rounded text-gray-600">
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                      {amenitySliders.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                          <MdPhotoLibrary size={32} className="text-gray-300 mb-2" />
                          <p className="text-gray-500 text-xs font-bold">Chưa có hình ảnh nào trong bộ sưu tập tiện ích</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
