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
  { id: "general", label: "Cấu hình chung", icon: MdSettings },
];

const SECTION_KEY_MAP = {
  about: ["describe-heading", "describe-bg-text", "describe-phone", "seo-h1-main", "bgTitle", "describe-frame-image", "describe-frame-image-mobile", "textDecription"],
  services: ["amenities-content", "amenities-description"],
  gallery: ["describe-h2", "describe-h2-image", "describe-h2-image-mobile", "gallery-heading", "room-heading"],
  faq: ["faq-heading", "faq_list"],
  blog: [
    "blog-heading",
    "blog-decoration",
    "blog-page-title",
    "blog-page-description",
    "sidebar-blog-title",
    "sidebar-blog-description"
  ],
};

const KEY_LABEL_MAP = {
  "describe-heading": "Tiêu đề nghệ thuật chính (H1)",
  "describe-bg-text": "Chữ nền nghệ thuật (Ví dụ: HOAHOCTRO)",
  "seo-h1-main": "Phòng Học Cho Thuê / Tiêu đề SEO (H1)",
  "describe-h2": "Tiêu đề chính phần Giải pháp (H2)",
  "describe-h2-image": "Ảnh tiện ích / dịch vụ dưới tiêu đề Giải pháp (Desktop)",
  "describe-h2-image-mobile": "Ảnh tiện ích / dịch vụ dưới tiêu đề Giải pháp (Mobile)",
  textDecription: "Nội dung bài viết Giới thiệu",
  "room-heading": "Tiêu đề khu vực phòng học",
  "amenities-content": "Tiêu đề khu vực tiện ích",
  "amenities-description": "Đoạn văn mô tả tiện ích chi tiết",
  "gallery-heading": "Tiêu đề bộ sưu tập ảnh",
  "blog-heading": "Tiêu đề chuyên mục tin tức (Home)",
  "blog-decoration": "Ảnh trang trí tiêu đề chuyên mục blog (Home)",
  "blog-page-title": "Tiêu đề trang danh sách Blog",
  "blog-page-description": "Nội dung mô tả trang danh sách Blog",
  "sidebar-blog-title": "Tiêu đề thẻ giới thiệu Blog ở Sidebar",
  "sidebar-blog-description": "Mô tả thẻ giới thiệu Blog ở Sidebar",
  "faq-heading": "Tiêu đề chuyên mục FAQ (H2)",
  "faq_list": "Danh sách câu hỏi thường gặp (FAQ)",
  bgTitle: "Ảnh trang trí nghệ thuật",
  "describe-frame-image": "Khung ảnh nền (sau HOAHOCTRO) (Desktop)",
  "describe-frame-image-mobile": "Khung ảnh nền (sau HOAHOCTRO) (Mobile)",
  "describe-phone": "Số điện thoại phần giới thiệu (Hero)",
  "amenities-slider-radius": "Bo góc slider tiện ích (px)",
  "gallery-slider-radius": "Bo góc slider không gian (px)",
};

const IMAGE_RECOMMENDATIONS = {
  "logo": "Khuyên dùng: 200x200px (Tỉ lệ 1:1, dạng vuông/tròn)",
  "logo-page-detail": "Khuyên dùng: 200x200px (Tỉ lệ 1:1, dạng vuông/tròn)",
  "icon-goc": "Khuyên dùng: 64x64px hoặc 128x128px (Dạng icon)",
  "bgTitle": "Khuyên dùng: 500x150px (Ảnh ngang trang trí)",
  "describe-frame-image": "Khuyên dùng: 1200x400px (Tỉ lệ ~ 3:1, Khung nền chính trên Desktop)",
  "describe-frame-image-mobile": "Khuyên dùng: 400x250px (Tỉ lệ ~ 1.6:1, Khung nền chính trên Mobile)",
  "nurseryImg": "Khuyên dùng: 1920x450px hoặc 1920x600px (Ảnh banner rộng)",
  "background": "Khuyên dùng: 1920x1080px (Ảnh nền trang web)",
  "imgContact": "Khuyên dùng: 800x600px (Tỉ lệ 4:3, Ảnh bên cạnh form liên hệ)",
  "describe-h2-image": "Khuyên dùng: 1100x405px (Khung giải pháp trên Desktop)",
  "describe-h2-image-mobile": "Khuyên dùng: 600x300px (Tỉ lệ 2:1, Khung giải pháp trên Mobile)",
  "blog-decoration": "Khuyên dùng: 300x100px (Ảnh nhỏ trang trí tiêu đề blog)",
};

const getImagePreviewStyle = (key) => {
  switch (key) {
    case "logo":
    case "logo-page-detail":
      return {
        wrapperClass: "w-24 h-24 sm:w-28 sm:h-28 border border-gray-100 flex items-center justify-center bg-gray-50",
        imgClass: "w-full h-full object-contain block",
        aspectRatio: "1/1",
        maxWidth: "112px",
      };
    case "icon-goc":
      return {
        wrapperClass: "w-16 h-16 border border-gray-100 flex items-center justify-center bg-gray-50",
        imgClass: "w-full h-full object-contain block",
        aspectRatio: "1/1",
        maxWidth: "64px",
      };
    case "bgTitle":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50 flex items-center justify-center",
        imgClass: "w-full h-full object-contain block",
        aspectRatio: "500/150",
        maxWidth: "500px",
      };
    case "describe-frame-image":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-fill block",
        aspectRatio: "3/1",
        maxWidth: "1200px",
      };
    case "describe-frame-image-mobile":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-fill block",
        aspectRatio: "1.6/1",
        maxWidth: "400px",
      };
    case "describe-h2-image":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-cover block",
        aspectRatio: "1100/405",
        maxWidth: "1100px",
      };
    case "describe-h2-image-mobile":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-cover block",
        aspectRatio: "2/1",
        maxWidth: "375px",
      };
    case "nurseryImg":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-cover block",
        aspectRatio: "1920/450",
        maxWidth: "100%",
      };
    case "background":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-cover block",
        aspectRatio: "16/9",
        maxWidth: "800px",
      };
    case "imgContact":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50",
        imgClass: "w-full h-full object-cover block",
        aspectRatio: "4/3",
        maxWidth: "800px",
      };
    case "blog-decoration":
      return {
        wrapperClass: "w-full border border-gray-100 bg-gray-50 flex items-center justify-center",
        imgClass: "w-full h-full object-contain block",
        aspectRatio: "480/100",
        maxWidth: "480px",
      };
    default:
      return {
        wrapperClass: "h-28 w-auto border border-gray-100 bg-gray-50",
        imgClass: "h-28 w-auto object-contain block",
        aspectRatio: "auto",
        maxWidth: "100%",
      };
  }
};

const TYPE_OPTIONS = [
  { value: "richtext", label: "Văn bản nghệ thuật (Word-like)" },
  { value: "text", label: "Văn bản thuần" },
  { value: "image", label: "Hình ảnh" },
  { value: "color", label: "Màu sắc" },
];

const EMPTY_NEW_CONFIG = { key: "", type: "richtext", section: "about", content: "", lineHeight: "", lineHeightMobile: "" };

const getRadiusStyle = (val) => {
  if (!val) return "0px";
  const cleanVal = String(val).trim();
  if (!cleanVal) return "0px";
  return /^[0-9]+$/.test(cleanVal) ? `${cleanVal}px` : cleanVal;
};

export default function CMS() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [activeSection, setActiveSection] = useState("about");
  const [openAdd, setOpenAdd] = useState(false);
  const [newConfig, setNewConfig] = useState(EMPTY_NEW_CONFIG);
  const [savingKey, setSavingKey] = useState(null);
  const [sliders, setSliders] = useState([]);
  const [amenitySliders, setAmenitySliders] = useState([]);
  const [dynamicFonts, setDynamicFonts] = useState([]);

  const FONT_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Amatic+SC:wght@400;700&family=Bebas+Neue&family=Caveat:wght@400..700&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Inter:wght@400..700&family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400..900;1,400..900&family=Nunito:ital,wght@0,400..900;1,400..900&family=Oswald:wght@400..700&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,400;0,700;1,400;1,700&family=Quicksand:wght@400..700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Satisfy&family=Syncopate:wght@400;700&family=Tangerine:wght@400;700&display=swap');
    
    .ql-size-small { font-size: 0.85rem !important; }
    .ql-size-large { font-size: 2rem !important; }
    .ql-size-huge { font-size: 5rem !important; }
    .ql-size-super-huge { font-size: 19vw !important; line-height: 1 !important; font-weight: 900 !important; text-transform: uppercase !important; }
    
    .quill-wrapper-container {
      position: relative !important;
      overflow: visible !important;
    }
    .quill-wrapper-container:focus-within,
    .quill-wrapper-container:has(.ql-expanded) {
      z-index: 25 !important;
    }
    .ql-toolbar.ql-snow {
      overflow: visible !important;
    }
    .ql-toolbar.ql-snow:focus-within,
    .ql-toolbar.ql-snow:has(.ql-expanded) {
      z-index: 25 !important;
    }

    .ql-snow .ql-picker.ql-font {
      width: 160px !important;
    }
    .ql-snow .ql-picker.ql-font .ql-picker-options {
      max-height: 250px;
      overflow-y: auto;
    }
    .ql-snow .ql-picker.ql-header {
      width: 120px !important;
    }
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"],
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"],
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"],
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"] {
      display: block !important;
    }
    .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before { content: 'Heading 3' !important; }
    .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before { content: 'Heading 4' !important; }
    .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before { content: 'Heading 5' !important; }
    .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
    .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before { content: 'Heading 6' !important; }
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

  const handleUpdateSliderRadius = async (id, borderRadius, type = "spaces") => {
    setIsLoading(true);
    try {
      const data = {
        borderRadius: borderRadius || ""
      };
      await fetchData(`${URL_API}api/slider/update/${id}`, "PUT", data);
      showToastSuccess("Đã cập nhật bo góc thành công");
      loadSliders(type);
    } catch (error) {
      showToastError("Cập nhật bo góc thất bại");
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
    if (config.type === "image" && config._file) {
      fd.set("content", config._file);
    } else {
      fd.set("content", config.content ?? "");
    }
    fd.append("type", config.type);
    fd.append("section", config.section || activeSection);
    fd.append("borderRadius", config.borderRadius || "");
    fd.append("lineHeight", config.lineHeight || "");
    fd.append("lineHeightMobile", config.lineHeightMobile || "");
    try {
      await fetchData(`${URL_API}api/config/update/${config.key}`, "PUT", fd, {
        "Content-Type": "multipart/form-data",
      });
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


  const getSectionConfigs = () => {
    const sectionKeys = SECTION_KEY_MAP[activeSection];
    const filtered = configs.filter((c) => {
      // Loại bỏ faq_list và home-h1 khỏi Cấu hình chung vì đã có chỗ quản lý riêng
      if (activeSection === "general" && (c.key === "faq_list" || c.key === "home-h1")) {
        return false;
      }

      // Loại bỏ các cấu hình bo góc khỏi danh sách thẻ riêng biệt vì đã được hiển thị inline trực tiếp ở tiêu đề bộ sưu tập
      if (c.key === "amenities-slider-radius" || c.key === "gallery-slider-radius") {
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
        <div className="space-y-6 overflow-visible">
          {faqData.map((item, index) => (
            <div key={index} className="relative p-6 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-4 overflow-visible">
              <button
                onClick={() => deleteFAQ(index)}
                className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Xóa câu hỏi"
              >
                <MdDelete size={20} />
              </button>

              <div className="grid grid-cols-1 gap-4 overflow-visible">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Câu hỏi {index + 1}</label>
                  <div className="bg-white rounded-xl overflow-visible border border-gray-200 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                    <style>{`
                      .faq-quill { overflow: visible !important; }
                      .faq-quill .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: #f9fafb; overflow: visible !important; }
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
                  <div className="bg-white rounded-xl overflow-visible border border-gray-200 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
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
            onChange={onContentChange}
            lineHeight={config.lineHeight}
            lineHeightMobile={config.lineHeightMobile}
            onChangeLineHeight={(val) => {
              setConfigs((prev) =>
                prev.map((c) => (c.key === config.key ? { ...c, lineHeight: val } : c))
              );
            }}
            onChangeLineHeightMobile={(val) => {
              setConfigs((prev) =>
                prev.map((c) => (c.key === config.key ? { ...c, lineHeightMobile: val } : c))
              );
            }}
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
        <div className="flex flex-col gap-6 w-full">
          <div className="space-y-4">
            <div>
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
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-1">Chấp nhận: .jpg, .png, .gif, .webp</p>
              {IMAGE_RECOMMENDATIONS[config.key] && (
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-1">
                  💡 {IMAGE_RECOMMENDATIONS[config.key]}
                </p>
              )}
            </div>
            
            <div className="max-w-[200px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Bo góc (px)</label>
              <Input
                type="text"
                placeholder="Ví dụ: 8, 12, 20"
                value={config.borderRadius || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfigs((prev) =>
                    prev.map((c) => (c.key === config.key ? { ...c, borderRadius: val } : c))
                  );
                }}
                className="!border-gray-100 focus:!border-primary !rounded-xl text-navy-700"
                labelProps={{ className: "hidden" }}
              />
            </div>
          </div>
          {config.content && (() => {
            const previewStyle = getImagePreviewStyle(config.key);
            return (
              <div className="space-y-2 mt-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ảnh xem trước (Khung chuẩn hiển thị thực tế)</label>
                <div 
                  className={`relative group shrink-0 overflow-hidden border border-gray-100 shadow-sm ${previewStyle.wrapperClass}`}
                  style={{ 
                    borderRadius: getRadiusStyle(config.borderRadius),
                    aspectRatio: previewStyle.aspectRatio,
                    maxWidth: previewStyle.maxWidth || "100%"
                  }}
                >
                  <img
                    src={config._file ? config.content : `${URL_API}${config.content.replace(/\\/g, "/")}`}
                    alt="preview"
                    className={previewStyle.imgClass}
                    style={{ borderRadius: getRadiusStyle(config.borderRadius) }}
                  />
                </div>
              </div>
            );
          })()}
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

    if (config.type === "text") {
      return (
        <Input
          type="text"
          value={config.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          className="!border-gray-100 focus:!border-primary !rounded-xl text-navy-700 bg-white"
          labelProps={{ className: "hidden" }}
        />
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

  const gallerySliderRadiusConfig = configs.find(c => c.key === "gallery-slider-radius");
  const gallerySliderRadius = gallerySliderRadiusConfig ? getRadiusStyle(gallerySliderRadiusConfig.content) : "0px";

  const amenitiesSliderRadiusConfig = configs.find(c => c.key === "amenities-slider-radius");
  const amenitiesSliderRadius = amenitiesSliderRadiusConfig ? getRadiusStyle(amenitiesSliderRadiusConfig.content) : "0px";

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
          ) : (sectionConfigs.length === 0 && activeSection !== "gallery" && activeSection !== "services") ? (
            <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <MdSettings className="h-16 w-16 text-gray-100 mb-4" />
              <p className="text-gray-400 font-bold">Mục này chưa có nội dung cấu hình</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sectionConfigs.map((config) => (
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
              ))}


              {activeSection === "gallery" && (
                <div className="mt-10 pt-10 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-navy-700">Bộ sưu tập hình ảnh không gian phòng học</h3>
                      <p className="text-[10px] text-navy-700/60 font-bold uppercase tracking-wider">Slider hiển thị tại trang chủ</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {gallerySliderRadiusConfig && (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Bo góc ảnh:</span>
                          <input
                            type="text"
                            placeholder="0"
                            value={gallerySliderRadiusConfig.content || ""}
                            onChange={(e) => updateField("gallery-slider-radius", e.target.value)}
                            className="w-14 h-8 text-center text-xs font-bold text-navy-700 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                          />
                          <span className="text-[11px] font-bold text-gray-500">px</span>
                          <button
                            onClick={() => saveConfig(gallerySliderRadiusConfig)}
                            disabled={savingKey === "gallery-slider-radius"}
                            className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1 min-w-[50px] justify-center"
                          >
                            {savingKey === "gallery-slider-radius" ? (
                              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span>Lưu</span>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex flex-col items-end gap-1">
                        <label className="cursor-pointer bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100">
                          <MdPhotoLibrary size={18} />
                          <span>Thêm ảnh mới</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleUploadSliders(e, "spaces")}
                            accept="image/*"
                          />
                        </label>
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">💡 Khuyên dùng: 1200x800px (Tỉ lệ 3:2)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sliders.map((slider, index) => (
                      <div
                        key={slider.id}
                        className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                        style={{ borderRadius: gallerySliderRadius }}
                      >
                        <div
                          draggable
                          onDragStart={(e) => onDragStart(e, index, "spaces")}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, index, "spaces")}
                          className="group relative aspect-video border-b border-gray-50 bg-gray-50 cursor-move overflow-hidden"
                          style={{ borderRadius: gallerySliderRadius }}
                        >
                          <img
                            src={`${URL_API}${slider.image.replace(/\\/g, "/")}`}
                            alt={slider.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            style={{ borderRadius: gallerySliderRadius }}
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-1 h-8 bg-primary rounded-full" />
                        <div>
                          <h3 className="text-sm font-bold text-navy-700">Bộ sưu tập ảnh Tiện ích & Dịch vụ</h3>
                          <p className="text-[10px] text-navy-700/60 font-bold uppercase tracking-wider">Hiển thị slider tại mục tiện ích</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        {amenitiesSliderRadiusConfig && (
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Bo góc ảnh:</span>
                            <input
                              type="text"
                              placeholder="0"
                              value={amenitiesSliderRadiusConfig.content || ""}
                              onChange={(e) => updateField("amenities-slider-radius", e.target.value)}
                              className="w-14 h-8 text-center text-xs font-bold text-navy-700 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                            />
                            <span className="text-[11px] font-bold text-gray-500">px</span>
                            <button
                              onClick={() => saveConfig(amenitiesSliderRadiusConfig)}
                              disabled={savingKey === "amenities-slider-radius"}
                              className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1 min-w-[50px] justify-center"
                            >
                              {savingKey === "amenities-slider-radius" ? (
                                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span>Lưu</span>
                              )}
                            </button>
                          </div>
                        )}

                        <div className="flex flex-col items-end gap-1">
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
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">💡 Khuyên dùng: 1280x800px (Tỉ lệ 16:10)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {amenitySliders.map((slider, index) => (
                        <div
                          key={slider.id}
                          className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                          style={{ borderRadius: amenitiesSliderRadius }}
                        >
                          <div
                            draggable
                            onDragStart={(e) => onDragStart(e, index, "services")}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, index, "services")}
                            className="group relative aspect-video border-b border-gray-50 bg-gray-50 cursor-move overflow-hidden"
                            style={{ borderRadius: amenitiesSliderRadius }}
                          >
                            <img
                              src={`${URL_API}${slider.image.replace(/\\/g, "/")}`}
                              alt={slider.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              style={{ borderRadius: amenitiesSliderRadius }}
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
