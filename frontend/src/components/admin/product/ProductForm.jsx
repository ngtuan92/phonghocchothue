"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Checkbox,
} from "@material-tailwind/react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import { MdSave, MdClose } from "react-icons/md";

const QuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);
import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

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
  const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
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
    entries.forEach(([name, value]) => {
      if (value) {
        target.style.setProperty(name, value);
      } else {
        target.style.removeProperty(name);
      }
    });
    if (!target.getAttribute("style")) {
      target.removeAttribute("style");
    }
  });

  return root.innerHTML;
};

function LazyQuillWrapper({ minHeight = "120px", ...props }) {
  const containerRef = useRef(null);
  const cancelQueuedMountRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    if (!node || typeof window === "undefined") return;

    cancelQueuedMountRef.current = enqueueQuillMount(() => {
      setShouldRender(true);
    });

    return () => {
      if (cancelQueuedMountRef.current) {
        cancelQueuedMountRef.current();
      }
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
          className="block w-full rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-left text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          style={{ minHeight }}
        >
          {previewText ? (
            <span className="line-clamp-4">{previewText}</span>
          ) : (
            <span className="text-gray-400">{props.placeholder || "Nhập nội dung..."}</span>
          )}
        </button>
      )}
    </div>
  );
}

LazyQuillWrapper.propTypes = {
  minHeight: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default function ProductForm({ dataEdit, onSave, onCancel, id, isPage = false }) {
  const [roomName, setRoomName] = useState("");
  const [roomNameRich, setRoomNameRich] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomContent, setRoomContent] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomEquipment, setRoomEquipment] = useState("");
  const [roomPrice, setRoomPrice] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isStatus, setIsStatus] = useState(true);
  const [singleImage, setSingleImage] = useState(null);
  const [multipleImages, setMultipleImages] = useState([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoImage, setSeoImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [roomLineHeight, setRoomLineHeight] = useState("");
  const [roomLineHeightMobile, setRoomLineHeightMobile] = useState("");
  const [roomFontSize, setRoomFontSize] = useState("");
  const [roomFontSizeMobile, setRoomFontSizeMobile] = useState("");
  const [roomPriceFontSize, setRoomPriceFontSize] = useState("");
  const [roomPriceFontSizeMobile, setRoomPriceFontSizeMobile] = useState("");
  const [roomPriceLineHeight, setRoomPriceLineHeight] = useState("");
  const [roomPriceLineHeightMobile, setRoomPriceLineHeightMobile] = useState("");
  const [roomPriceTranslateY, setRoomPriceTranslateY] = useState("");
  const [roomPriceTranslateYMobile, setRoomPriceTranslateYMobile] = useState("");
  const [roomEquipmentFontSize, setRoomEquipmentFontSize] = useState("");
  const [roomEquipmentFontSizeMobile, setRoomEquipmentFontSizeMobile] = useState("");
  const [roomEquipmentLineHeight, setRoomEquipmentLineHeight] = useState("");
  const [roomEquipmentLineHeightMobile, setRoomEquipmentLineHeightMobile] = useState("");
  const [roomEquipmentTranslateY, setRoomEquipmentTranslateY] = useState("");
  const [roomEquipmentTranslateYMobile, setRoomEquipmentTranslateYMobile] = useState("");
  const [roomNameFontSize, setRoomNameFontSize] = useState("");
  const [roomNameFontSizeMobile, setRoomNameFontSizeMobile] = useState("");
  const [roomTranslateY, setRoomTranslateY] = useState("");
  const [roomTranslateYMobile, setRoomTranslateYMobile] = useState("");

  const handleSingleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSingleImage(file);
    }
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  useEffect(() => {
    if (dataEdit) {
      setRoomName(dataEdit.name || "");
      setRoomNameRich(dataEdit.name_rich || (dataEdit.name ? `<h2>${dataEdit.name}</h2>` : ""));
      setRoomContent(dataEdit.content || "");
      setRoomSlug(dataEdit.slug || "");
      setRoomDescription(dataEdit.description || "");

      let mergedEquipment = dataEdit.equipment || "";
      if (dataEdit.contains && dataEdit.contains.trim() && dataEdit.contains.trim() !== "0") {
        const cleanContains = dataEdit.contains.trim();
        if (cleanContains !== "<p><br></p>" && cleanContains !== "") {
          if (mergedEquipment && mergedEquipment !== "<p><br></p>" && mergedEquipment !== "") {
            mergedEquipment = `${mergedEquipment}<p></p>${cleanContains}`;
          } else {
            mergedEquipment = cleanContains;
          }
        }
      }
      setRoomEquipment(mergedEquipment);
      setRoomPrice(dataEdit.price || "");
      setIsChecked(dataEdit.isSpecial || false);
      setIsStatus(dataEdit.status == 1);
      setSeoTitle(dataEdit.seoTitle || "");
      setSeoDescription(dataEdit.seoDescription || "");
      setSeoKeywords(dataEdit.seoKeywords || "");
      setRoomLineHeight(dataEdit.lineHeight || "");
      setRoomLineHeightMobile(dataEdit.lineHeightMobile || "");
      setRoomFontSize(dataEdit.fontSize || "");
      setRoomFontSizeMobile(dataEdit.fontSizeMobile || "");
      const priceControls = extractResponsiveControls(dataEdit.price || "");
      const equipmentControls = extractResponsiveControls(mergedEquipment || "");
      setRoomPriceFontSize(priceControls.fontSize || dataEdit.fontSize || "");
      setRoomPriceFontSizeMobile(priceControls.fontSizeMobile || dataEdit.fontSizeMobile || "");
      setRoomPriceLineHeight(priceControls.lineHeight || dataEdit.lineHeight || "");
      setRoomPriceLineHeightMobile(priceControls.lineHeightMobile || dataEdit.lineHeightMobile || "");
      setRoomPriceTranslateY(priceControls.translateY || dataEdit.translateY || "");
      setRoomPriceTranslateYMobile(priceControls.translateYMobile || dataEdit.translateYMobile || "");
      setRoomEquipmentFontSize(equipmentControls.fontSize || dataEdit.fontSize || "");
      setRoomEquipmentFontSizeMobile(equipmentControls.fontSizeMobile || dataEdit.fontSizeMobile || "");
      setRoomEquipmentLineHeight(equipmentControls.lineHeight || dataEdit.lineHeight || "");
      setRoomEquipmentLineHeightMobile(equipmentControls.lineHeightMobile || dataEdit.lineHeightMobile || "");
      setRoomEquipmentTranslateY(equipmentControls.translateY || dataEdit.translateY || "");
      setRoomEquipmentTranslateYMobile(equipmentControls.translateYMobile || dataEdit.translateYMobile || "");
      setRoomNameFontSize(dataEdit.nameFontSize || "");
      setRoomNameFontSizeMobile(dataEdit.nameFontSizeMobile || "");
      setRoomTranslateY(dataEdit.translateY || "");
      setRoomTranslateYMobile(dataEdit.translateYMobile || "");

      if (dataEdit.image) {
        setSingleImage(dataEdit.image.startsWith('http') ? dataEdit.image : `${URL_API}${dataEdit.image.replaceAll("\\", "/")}`);
      }
      if (dataEdit.images) {
        const images = [];
        for (const image of dataEdit.images) {
          const path = image?.image_detail || image?.image;
          if (path) {
            images.push(path.startsWith('http') ? path : `${URL_API}${path.replaceAll("\\", "/")}`);
          }
        }
        setMultipleImages(images);
      }
      if (dataEdit.seoImage) {
        setSeoImage(dataEdit.seoImage.startsWith('http') ? dataEdit.seoImage : `${URL_API}${dataEdit.seoImage.replaceAll("\\", "/")}`);
      }
    }
  }, [dataEdit]);

  const handleMultipleImagesChange = (event) => {
    const files = Array.from(event.target.files);
    setMultipleImages((prev) => [...prev, ...files]);
  };

  const handleRoomSlugChange = (event) => setRoomSlug(event.target.value);
  const handleStatusChange = (event) => setIsStatus(event.target.checked);
  const handleCheckboxChange = (event) => setIsChecked(event.target.checked);
  const removeSingleImage = () => setSingleImage(null);
  const removeMultipleImage = (index) => setMultipleImages((prev) => prev.filter((_, i) => i !== index));
  const handleSeoTitleChange = (event) => setSeoTitle(event.target.value);
  const handleSeoDescriptionChange = (event) => setSeoDescription(event.target.value);
  const handleSeoKeywordsChange = (event) => setSeoKeywords(event.target.value);
  const handleSeoImageChange = (event) => {
    const file = event.target.files[0];
    if (file) setSeoImage(file);
  };
  const removeSeoImage = () => setSeoImage(null);

  const validateInputs = () => {
    const newErrors = {};
    if (!roomName.trim()) newErrors.roomName = "Tên phòng không được để trống.";
    if (!roomSlug.trim()) newErrors.roomSlug = "Slug không được để trống.";
    if (!singleImage) newErrors.image = "Ảnh phòng không được để trống.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateInputs()) {
      const price = decorateRichTextWithControls(roomPrice, {
        fontSize: roomPriceFontSize,
        fontSizeMobile: roomPriceFontSizeMobile,
        lineHeight: roomPriceLineHeight,
        lineHeightMobile: roomPriceLineHeightMobile,
        translateY: roomPriceTranslateY,
        translateYMobile: roomPriceTranslateYMobile,
      });
      const equipment = decorateRichTextWithControls(roomEquipment, {
        fontSize: roomEquipmentFontSize,
        fontSizeMobile: roomEquipmentFontSizeMobile,
        lineHeight: roomEquipmentLineHeight,
        lineHeightMobile: roomEquipmentLineHeightMobile,
        translateY: roomEquipmentTranslateY,
        translateYMobile: roomEquipmentTranslateYMobile,
      });
      const data = {
        name: roomName,
        name_rich: roomNameRich,
        image: singleImage,
        imageDetail: multipleImages,
        content: roomContent,
        description: roomDescription,
        equipment,
        price,
        contains: "",
        isSpecial: isChecked,
        status: isStatus ? 1 : 0,
        slug: roomSlug,
        seoTitle,
        seoDescription,
        seoKeywords,
        seoImage,
        lineHeight: roomLineHeight,
        lineHeightMobile: roomLineHeightMobile,
        fontSize: roomFontSize,
        fontSizeMobile: roomFontSizeMobile,
        nameFontSize: roomNameFontSize,
        nameFontSizeMobile: roomNameFontSizeMobile,
        translateY: roomTranslateY,
        translateYMobile: roomTranslateYMobile,
      };
      onSave(data);
    }
  };

  return (
    <form
      id="product-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6"
    >
      <div className="w-full bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
        {/* Thông tin cơ bản */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <span className="text-xl text-[#15803d]">📋</span>
            <Typography variant="h6" className="font-bold text-[#15803d]">
              Thông tin cơ bản
            </Typography>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tên phòng */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="room-name-rich" className="block text-sm font-bold text-navy-700">
                Tên phòng (Nghệ thuật - H1, H2, Font...) <span className="text-red-500">*</span>
              </label>
              <div id="room-name-rich" className="product-dialog-quill product-dialog-quill--name border border-gray-200 rounded-xl overflow-visible bg-white">
                <QuillWrapper
                  key={`quill-name-${id || 'new'}`}
                  theme="snow"
                  value={roomNameRich}
                  onChange={(val) => {
                    setRoomNameRich(val);
                    let plainText = "";
                    if (typeof window !== "undefined") {
                      const tempDiv = document.createElement("div");
                      tempDiv.innerHTML = val;
                      plainText = (tempDiv.textContent || tempDiv.innerText || "").trim();
                    } else {
                      plainText = val.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
                    }
                    setRoomName(plainText);
                    const generatedSlug = plainText
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/đ/g, "d")
                      .replace(/[^a-z0-9\s-]/g, "")
                      .trim()
                      .replace(/[\s-]+/g, "-");
                    setRoomSlug(generatedSlug);
                    setErrors((prev) => ({ ...prev, roomName: "" }));
                  }}
                  placeholder="Nhập tên phòng..."
                  isBlogEditor={true}
                  lineHeight={roomLineHeight}
                  lineHeightMobile={roomLineHeightMobile}
                  fontSize={roomNameFontSize}
                  fontSizeMobile={roomNameFontSizeMobile}
                  translateY={roomTranslateY}
                  translateYMobile={roomTranslateYMobile}
                  onChangeLineHeight={setRoomLineHeight}
                  onChangeLineHeightMobile={setRoomLineHeightMobile}
                  onChangeFontSize={setRoomNameFontSize}
                  onChangeFontSizeMobile={setRoomNameFontSizeMobile}
                  onChangeTranslateY={setRoomTranslateY}
                  onChangeTranslateYMobile={setRoomTranslateYMobile}
                  hasResponsiveFontSize={true}
                />
              </div>
              {errors.roomName && (
                <Typography variant="small" color="red" className="mt-1 flex items-center gap-1 font-medium text-xs">
                  <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.roomName}
                </Typography>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label htmlFor="room-slug" className="block text-sm font-bold text-navy-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="room-slug"
                type="text"
                className={`w-full px-4 py-2.5 text-sm text-gray-700 bg-white border rounded-xl focus:outline-none transition-colors ${
                  errors.roomSlug ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#15803d]"
                }`}
                value={roomSlug}
                onChange={handleRoomSlugChange}
                placeholder="vi-du-ten-phong"
              />
              {errors.roomSlug && (
                <Typography variant="small" color="red" className="mt-1 flex items-center gap-1 font-medium text-xs">
                  <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.roomSlug}
                </Typography>
              )}
            </div>

            {/* Cấu hình hiển thị */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-navy-700">
                Trạng thái phòng
              </label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-xl hover:bg-gray-50/50 transition-colors flex-1">
                  <Checkbox
                    id="checkbox-special"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    color="green"
                  />
                  <label htmlFor="checkbox-special" className="flex-1 cursor-pointer">
                    <Typography variant="h6" className="font-bold text-navy-700 text-xs">
                      Phòng nổi bật
                    </Typography>
                  </label>
                </div>

                <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-xl hover:bg-gray-50/50 transition-colors flex-1">
                  <Checkbox
                    id="checkbox-status"
                    checked={isStatus}
                    onChange={handleStatusChange}
                    color="green"
                  />
                  <label htmlFor="checkbox-status" className="flex-1 cursor-pointer">
                    <Typography variant="h6" className="font-bold text-navy-700 text-xs">
                      Còn phòng trống
                    </Typography>
                  </label>
                </div>
              </div>
            </div>

            {/* Giá thuê */}
            <div className="space-y-2">
              <label htmlFor="room-price" className="block text-sm font-bold text-navy-700">
                💵 Giá thuê (VNĐ)
              </label>
              <div id="room-price" className="product-dialog-quill product-dialog-quill--price border border-gray-200 rounded-xl overflow-visible bg-white">
                <LazyQuillWrapper
                  key={`quill-price-${id || 'new'}`}
                  theme="snow"
                  value={roomPrice}
                  onChange={(val) => setRoomPrice(val)}
                  placeholder="Ví dụ: 80.000 đ/h..."
                  isBlogEditor={true}
                  disableImageWrap={true}
                  lineHeight={roomPriceLineHeight}
                  lineHeightMobile={roomPriceLineHeightMobile}
                  fontSize={roomPriceFontSize}
                  fontSizeMobile={roomPriceFontSizeMobile}
                  translateY={roomPriceTranslateY}
                  translateYMobile={roomPriceTranslateYMobile}
                  onChangeLineHeight={setRoomPriceLineHeight}
                  onChangeLineHeightMobile={setRoomPriceLineHeightMobile}
                  onChangeFontSize={setRoomPriceFontSize}
                  onChangeFontSizeMobile={setRoomPriceFontSizeMobile}
                  onChangeTranslateY={setRoomPriceTranslateY}
                  onChangeTranslateYMobile={setRoomPriceTranslateYMobile}
                  hasResponsiveFontSize={true}
                />
              </div>
            </div>

            {/* Thiết bị tóm tắt */}
            <div className="space-y-2">
              <label htmlFor="room-equipment" className="block text-sm font-bold text-navy-700">
                📝 Thiết bị & Tiện ích tóm tắt
              </label>
              <div id="room-equipment" className="product-dialog-quill product-dialog-quill--equipment border border-gray-200 rounded-xl overflow-visible bg-white">
                <LazyQuillWrapper
                  key={`quill-equipment-${id || 'new'}`}
                  theme="snow"
                  value={roomEquipment}
                  onChange={(val) => setRoomEquipment(val)}
                  placeholder="Ví dụ: Sức chứa 45 chỗ..."
                  isBlogEditor={true}
                  disableImageWrap={true}
                  lineHeight={roomEquipmentLineHeight}
                  lineHeightMobile={roomEquipmentLineHeightMobile}
                  fontSize={roomEquipmentFontSize}
                  fontSizeMobile={roomEquipmentFontSizeMobile}
                  translateY={roomEquipmentTranslateY}
                  translateYMobile={roomEquipmentTranslateYMobile}
                  onChangeLineHeight={setRoomEquipmentLineHeight}
                  onChangeLineHeightMobile={setRoomEquipmentLineHeightMobile}
                  onChangeFontSize={setRoomEquipmentFontSize}
                  onChangeFontSizeMobile={setRoomEquipmentFontSizeMobile}
                  onChangeTranslateY={setRoomEquipmentTranslateY}
                  onChangeTranslateYMobile={setRoomEquipmentTranslateYMobile}
                  hasResponsiveFontSize={true}
                  inlineSelectionControls={true}
                />
              </div>
            </div>

            {/* Mô tả tóm tắt */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="room-desc" className="block text-sm font-bold text-navy-700">
                Mô tả tóm tắt (Meta Description)
              </label>
              <textarea
                id="room-desc"
                rows={2}
                className="w-full px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="Mô tả ngắn gọn đặc điểm nổi bật..."
              />
            </div>
          </div>
        </div>

        {/* Hình ảnh & SEO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-6">
          {/* Cột 1: Hình ảnh */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl text-[#15803d]">🖼️</span>
              <Typography variant="h6" className="font-bold text-[#15803d]">
                Hình ảnh sản phẩm
              </Typography>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="single-image" className="block text-xs font-bold text-navy-700">
                Ảnh đại diện (Thumbnail) <span className="text-red-500">*</span>
              </label>
              <input
                id="single-image"
                type="file"
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-[#15803d] hover:file:bg-green-100 transition-all cursor-pointer"
                onChange={handleSingleImageChange}
                accept="image/*"
              />
              {singleImage && (
                <div className="relative inline-block w-full aspect-video border border-gray-200 rounded-none overflow-hidden shadow-sm mt-2">
                  <img
                    src={typeof singleImage === "string" ? singleImage : URL.createObjectURL(singleImage)}
                    alt="Thumbnail Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-md transition-all active:scale-95"
                    onClick={removeSingleImage}
                  >
                    ×
                  </button>
                </div>
              )}
              {errors.image && (
                <Typography variant="small" color="red" className="mt-1 flex items-center gap-1 font-medium text-xs">
                  <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.image}
                </Typography>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label htmlFor="multiple-images" className="block text-xs font-bold text-navy-700">
                Bộ sưu tập ảnh chi tiết (Gallery)
              </label>
              <input
                id="multiple-images"
                type="file"
                multiple
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-[#15803d] hover:file:bg-green-100 transition-all cursor-pointer"
                onChange={handleMultipleImagesChange}
                accept="image/*"
              />
              {multipleImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {multipleImages.map((image, index) => (
                    <div key={index} className="relative w-full aspect-square border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <img
                        src={typeof image === "string" ? image : URL.createObjectURL(image)}
                        alt={`Detail Preview ${index}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md transition-all active:scale-95"
                        onClick={() => removeMultipleImage(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cột 2: SEO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl text-[#15803d]">🔍</span>
              <Typography variant="h6" className="font-bold text-[#15803d]">
                Cấu hình SEO
              </Typography>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="seo-title" className="block text-xs font-bold text-navy-700">
                  SEO Title
                </label>
                <input
                  id="seo-title"
                  type="text"
                  className="w-full px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                  value={seoTitle}
                  onChange={handleSeoTitleChange}
                  placeholder="Tiêu đề SEO cho phòng học..."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="seo-description" className="block text-xs font-bold text-navy-700">
                  SEO Description
                </label>
                <textarea
                  id="seo-description"
                  className="w-full px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                  value={seoDescription}
                  onChange={handleSeoDescriptionChange}
                  placeholder="Mô tả SEO ngắn gọn..."
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="seo-keywords" className="block text-xs font-bold text-navy-700">
                  SEO Keywords
                </label>
                <input
                  id="seo-keywords"
                  type="text"
                  className="w-full px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                  value={seoKeywords}
                  onChange={handleSeoKeywordsChange}
                  placeholder="Từ khóa cách nhau bằng dấu phẩy..."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="seo-image" className="block text-xs font-bold text-navy-700">
                  SEO Image
                </label>
                <input
                  id="seo-image"
                  type="file"
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-[#15803d] hover:file:bg-green-100 transition-all cursor-pointer"
                  onChange={handleSeoImageChange}
                  accept="image/*"
                />
                {seoImage && (
                  <div className="relative inline-block w-20 h-20 border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-2">
                    <img
                      src={typeof seoImage === "string" ? seoImage : URL.createObjectURL(seoImage)}
                      alt="SEO Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md transition-all active:scale-95"
                      onClick={removeSeoImage}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mô tả chi tiết phòng học (CKEditor) */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <span className="text-xl text-[#15803d]">📝</span>
            <Typography variant="h6" className="font-bold text-[#15803d]">
              Mô tả chi tiết phòng học (CKEditor)
            </Typography>
          </div>
          
          {/* Canvas rộng tối đa đạt đúng cấu trúc tỉ lệ hiển thị trên trang public */}
          <div className="w-full bg-white rounded-xl ckeditor-content content-img py-2">
            <div className="product-dialog-quill product-dialog-quill--content border border-gray-200 rounded-xl overflow-visible bg-white shadow-sm ring-1 ring-black/5">
              <QuillWrapper
                key={`quill-content-${id || 'new'}`}
                theme="snow"
                value={roomContent}
                onChange={(val) => setRoomContent(val)}
                placeholder="Nhập mô tả chi tiết phòng học..."
                isBlogEditor={true}
                lineHeight={roomLineHeight}
                lineHeightMobile={roomLineHeightMobile}
                fontSize={roomFontSize}
                fontSizeMobile={roomFontSizeMobile}
                translateY={roomTranslateY}
                translateYMobile={roomTranslateYMobile}
                onChangeLineHeight={setRoomLineHeight}
                onChangeLineHeightMobile={setRoomLineHeightMobile}
                onChangeFontSize={setRoomFontSize}
                onChangeFontSizeMobile={setRoomFontSizeMobile}
                onChangeTranslateY={setRoomTranslateY}
                onChangeTranslateYMobile={setRoomTranslateYMobile}
                hasResponsiveFontSize={true}
                inlineSelectionControls={true}
              />
            </div>
          </div>
        </div>

        {/* Cấu hình nút lưu ở dưới cùng */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
          >
            <MdClose className="h-5 w-5" />
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-12 py-3 bg-[#15803d] hover:bg-[#166534] text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-green-100"
          >
            <MdSave className="h-5 w-5" />
            Lưu thông tin phòng
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .product-dialog-quill {
          position: relative;
          overflow: visible;
        }
        .product-dialog-quill .quill-wrapper-container {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: visible !important;
          position: relative !important;
          z-index: 10;
        }
        .product-dialog-quill .quill-wrapper-container:focus-within,
        .product-dialog-quill .quill-wrapper-container:has(.ql-expanded) {
          border-color: #15803d;
          box-shadow: 0 0 0 1px rgba(21, 128, 61, 0.3);
          z-index: 100 !important;
        }
        .product-dialog-quill .ql-toolbar.ql-snow {
          position: relative !important;
          overflow: visible !important;
        }
        .product-dialog-quill .quill-wrapper-container.is-sticky .ql-toolbar.ql-snow {
          position: sticky !important;
          top: var(--quill-toolbar-top, 0px) !important;
          z-index: 2010 !important;
          overflow: visible !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
        }
        .product-dialog-quill .ql-snow .ql-picker-options {
          z-index: 200 !important;
        }
        .product-dialog-quill--name .ql-editor {
          min-height: 100px;
        }
        .product-dialog-quill--content .ql-editor {
          min-height: 350px;
        }
        .product-dialog-quill--price .ql-editor,
        .product-dialog-quill--equipment .ql-editor {
          min-height: 80px;
        }
      ` }} />
    </form>
  );
}

ProductForm.propTypes = {
  dataEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
