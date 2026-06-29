"use client"

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardFooter,
  DialogHeader,
  Typography,
  Input,
  Textarea,
  Button,
  Checkbox,
} from "@material-tailwind/react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";

import { FaExclamationTriangle } from "react-icons/fa";

const QuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);
import "react-quill-new/dist/quill.snow.css";


// eslint-disable-next-line no-undef
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

function LazyQuillWrapper({ minHeight = "120px", ...props }) {
  const containerRef = useRef(null);
  const cancelQueuedMountRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

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
          className="block w-full rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-left text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          style={{ minHeight }}
        >
          {previewText ? (
            <span className="line-clamp-4">{previewText}</span>
          ) : (
            <span className="text-gray-400">{props.placeholder || "Nhap noi dung..."}</span>
          )}
        </button>
      )}
    </div>
  );
}

LazyQuillWrapper.propTypes = {
  minHeight: PropTypes.string,
};

function DialogComponent({ open, id, handleOpen, onSave, dataEdit }) {
  const [roomName, setRoomName] = useState("");
  const [roomNameRich, setRoomNameRich] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomContent, setRoomContent] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomEquipment, setRoomEquipment] = useState("");
  const [roomPrice, setRoomPrice] = useState(0);
  const [roomContains, setRoomContains] = useState("");
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
  const [roomTranslateY, setRoomTranslateY] = useState("");
  const [roomTranslateYMobile, setRoomTranslateYMobile] = useState("");

  const setIfChanged = (setter, nextValue) => {
    setter((prev) => (prev === nextValue ? prev : nextValue));
  };

  const handleSingleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSingleImage(file);
    }
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  useEffect(() => {
    if (open) {
      if (dataEdit) {
        setRoomName(dataEdit.name || "");
        setRoomNameRich(dataEdit.name_rich || (dataEdit.name ? `<h2>${dataEdit.name}</h2>` : ""));
        setRoomContent(dataEdit.content || "");
        setRoomSlug(dataEdit.slug || "");
        setRoomDescription(dataEdit.description || "");
        setRoomEquipment(dataEdit.equipment || "");
        setRoomPrice(dataEdit.price || "");
        setRoomContains(dataEdit.contains || "");
        setIsChecked(dataEdit.isSpecial || false);
        if (dataEdit.status == 1) {
          setIsStatus(true);
        } else {
          setIsStatus(false);
        }
        setSeoTitle(dataEdit.seoTitle || "");
        setSeoDescription(dataEdit.seoDescription || "");
        setSeoKeywords(dataEdit.seoKeywords || "");
        setRoomLineHeight(dataEdit.lineHeight || "");
        setRoomLineHeightMobile(dataEdit.lineHeightMobile || "");
        setRoomFontSize(dataEdit.fontSize || "");
        setRoomFontSizeMobile(dataEdit.fontSizeMobile || "");
        setRoomTranslateY(dataEdit.translateY || "");
        setRoomTranslateYMobile(dataEdit.translateYMobile || "");

        if (dataEdit.image) {
          setSingleImage(`${URL_API}${dataEdit.image.replaceAll("\\", "/")}`);
        }
        if (dataEdit.images) {
          const images = [];
          for (const image of dataEdit.images) {
            images.push(`${URL_API}${image?.image_detail?.replaceAll("\\", "/")}`);
          }

          setMultipleImages(images);
        }
        if (dataEdit.seoImage) {
          setSeoImage(`${URL_API}${dataEdit.seoImage.replaceAll("\\", "/")}`);
        } else {
          setSeoImage(null);
        }
      } else {
        setRoomName("");
        setRoomNameRich("");
        setRoomContent("");
        setRoomSlug("");
        setRoomDescription("");
        setRoomEquipment("");
        setRoomPrice("");
        setRoomContains("");
        setIsChecked(false);
        setIsStatus(false);
        setSingleImage(null);
        setMultipleImages([]);
        setSeoTitle("");
        setSeoDescription("");
        setSeoKeywords("");
        setSeoImage(null);
        setRoomLineHeight("");
        setRoomLineHeightMobile("");
        setRoomFontSize("");
        setRoomFontSizeMobile("");
        setRoomTranslateY("");
        setRoomTranslateYMobile("");
      }
    }
  }, [open, dataEdit]);

  const handleMultipleImagesChange = (event) => {
    const files = Array.from(event.target.files);
    setMultipleImages((prev) => [...prev, ...files]);
  };

  const handleRoomSlugChange = (event) => {
    setRoomSlug(event.target.value);
  };

  const handleStatusChange = (event) => {
    setIsStatus(event.target.checked);
  };

  const handleCheckboxChange = (event) => {
    setIsChecked(event.target.checked);
  };

  const removeSingleImage = () => {
    setSingleImage(null);
  };

  const removeMultipleImage = (index) => {
    setMultipleImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSeoTitleChange = (event) => {
    setSeoTitle(event.target.value);
  };

  const handleSeoDescriptionChange = (event) => {
    setSeoDescription(event.target.value);
  };

  const handleSeoKeywordsChange = (event) => {
    setSeoKeywords(event.target.value);
  };

  const handleSeoImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSeoImage(file);
    }
  };

  const removeSeoImage = () => {
    setSeoImage(null);
  };

  const validateInputs = () => {
    const newErrors = {};
    if (!roomName.trim()) {
      newErrors.roomName = "Tên phòng không được để trống.";
    }
    if (!roomSlug.trim()) {
      newErrors.roomSlug = "Slug không được để trống.";
    }
    if (!singleImage) {
      newErrors.image = "Ảnh phòng không được để trống.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateInputs()) {
      const data = {
        name: roomName,
        name_rich: roomNameRich,
        image: singleImage,
        imageDetail: multipleImages,
        content: roomContent,
        description: roomDescription,
        equipment: roomEquipment,
        price: roomPrice,
        contains: roomContains,
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
        translateY: roomTranslateY,
        translateYMobile: roomTranslateYMobile,
      };

      onSave(data);
    }
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity border-0 p-0 cursor-pointer"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleOpen();
          }
        }}
        aria-label="Đóng dialog"
      />

      {/* Dialog Content */}
      <Card className="relative w-full max-w-[95vw] xl:max-w-[1350px] shadow-2xl max-h-[90vh] flex flex-col bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogHeader className="flex flex-col items-start p-0">
            <Typography className="text-2xl font-bold text-[#15803d]" variant="h4">
              {id ? "✏️ Chỉnh sửa phòng" : "➕ Thêm phòng mới"}
            </Typography>
            <Typography variant="small" className="text-gray-500 mt-1">
              {id ? "Cập nhật thông tin phòng cho thuê" : "Điền thông tin để thêm phòng mới"}
            </Typography>
          </DialogHeader>
          <button
            onClick={handleOpen}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Đóng"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6 text-gray-600"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <CardBody className="flex flex-col gap-6 overflow-y-auto px-6 py-6 flex-1 min-h-0">
          {/* Section 1: Thông tin cơ bản */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl">📋</span>
              <Typography variant="h6" className="font-semibold text-[#15803d]">
                Thông tin cơ bản
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tên phòng (Nghệ thuật) */}
              <div className="md:col-span-2">
                <label htmlFor="room-name-rich" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên phòng (Nghệ thuật - H1, H2, Font...) <span className="text-red-500">*</span>
                </label>
                <div id="room-name-rich" className="product-dialog-quill product-dialog-quill--name">
                  <QuillWrapper
                    key={`quill-name-${id || 'new'}-${open}`}
                    theme="snow"
                    value={roomNameRich}
                    onChange={(val) => {
                      setIfChanged(setRoomNameRich, val);
                      
                      // Extract plain text safely, decoding HTML entities
                      let plainText = "";
                      if (typeof window !== "undefined") {
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = val;
                        plainText = (tempDiv.textContent || tempDiv.innerText || "").trim();
                      } else {
                        plainText = val.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
                      }
                      setIfChanged(setRoomName, plainText);
                      
                      // Auto slug with Vietnamese accent removal
                      const generatedSlug = plainText
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/đ/g, "d")
                        .replace(/[^a-z0-9\s-]/g, "")
                        .trim()
                        .replace(/[\s-]+/g, "-");
                      setIfChanged(setRoomSlug, generatedSlug);
                      
                      setErrors((prev) => ({ ...prev, roomName: "" }));
                    }}
                    placeholder="Nhập tên phòng..."
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
                  />
                </div>
                {errors.roomName && (
                  <Typography variant="small" color="red" className="mt-1 flex items-center gap-1">
                    <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.roomName}
                  </Typography>
                )}
              </div>

              {/* Slug */}
              <div className="md:col-span-2">
                <label htmlFor="room-slug" className="block text-sm font-medium text-gray-700 mb-2">
                  Slug <span className="text-red-500">*</span>
                </label>
                <Input
                  id="room-slug"
                  size="lg"
                  className="!border-gray-300 focus:!border-blue-500 placeholder:!text-gray-600"
                  value={roomSlug}
                  onChange={handleRoomSlugChange}
                  placeholder="vi-du-ten-phong"
                  error={!!errors.roomSlug}
                />
                {errors.roomSlug && (
                  <Typography variant="small" color="red" className="mt-1 flex items-center gap-1">
                    <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.roomSlug}
                  </Typography>
                )}
              </div>

              {/* Giá thuê */}
              <div>
                <label htmlFor="room-price" className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Giá thuê (VNĐ)
                </label>
                <div id="room-price" className="product-dialog-quill product-dialog-quill--price">
                  <LazyQuillWrapper
                    key={`quill-price-${id || 'new'}-${open}`}
                    theme="snow"
                    value={roomPrice}
                    onChange={(val) => setIfChanged(setRoomPrice, val)}
                    placeholder="Ví dụ: 80.000 đ/h..."
                    disableImageWrap={true}
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
                  />
                </div>
              </div>

              {/* Thiết bị */}
              <div>
                <label htmlFor="room-equipment" className="block text-sm font-medium text-gray-700 mb-2">
                  🔌 Thiết bị
                </label>
                <div id="room-equipment" className="product-dialog-quill product-dialog-quill--equipment">
                  <LazyQuillWrapper
                    key={`quill-equipment-${id || 'new'}-${open}`}
                    theme="snow"
                    value={roomEquipment}
                    onChange={(val) => setIfChanged(setRoomEquipment, val)}
                    placeholder="Ví dụ: Máy chiếu, điều hòa, bảng trắng..."
                    disableImageWrap={true}
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
                  />
                </div>
              </div>

              {/* Chứa */}
              <div className="md:col-span-2">
                <label htmlFor="room-contains" className="block text-sm font-medium text-gray-700 mb-2">
                  👥 Sức chứa
                </label>
                <div id="room-contains" className="product-dialog-quill product-dialog-quill--contains">
                  <LazyQuillWrapper
                    key={`quill-contains-${id || 'new'}-${open}`}
                    theme="snow"
                    value={roomContains}
                    onChange={(val) => setIfChanged(setRoomContains, val)}
                    placeholder="Ví dụ: Sức chứa 45 chỗ ngồi..."
                    disableImageWrap={true}
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
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Hình ảnh */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl">🖼️</span>
              <Typography variant="h6" className="font-semibold text-[#15803d]">
                Hình ảnh
              </Typography>
            </div>

            {/* Ảnh chính */}
            <div>
              <label htmlFor="single-image" className="block text-sm font-medium text-gray-700 mb-1">
                Ảnh đại diện <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs font-medium text-gray-500">
                Khuyến nghị: 800 x 875px, tỷ lệ 32:35. Dùng ảnh dọc nhẹ, rõ chủ thể phòng.
              </p>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Input
                    id="single-image"
                    type="file"
                    size="lg"
                    className="file-input cursor-pointer"
                    onChange={handleSingleImageChange}
                    accept="image/*"
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3 pointer-events-none">
                    <span className="text-sm text-gray-500">📁 Chọn ảnh</span>
                  </div>
                </div>
                {errors.image && (
                  <Typography variant="small" color="red" className="flex items-center gap-1">
                    <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.image}
                  </Typography>
                )}
                {singleImage && (
                  <div className="relative inline-block w-48 h-48 border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                    <img
                      src={
                        typeof singleImage === "string"
                          ? singleImage
                          : URL.createObjectURL(singleImage)
                      }
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 focus:outline-none shadow-lg transition-all"
                      onClick={removeSingleImage}
                      aria-label="Xóa ảnh"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ảnh chi tiết */}
            <div>
              <label htmlFor="multiple-images" className="block text-sm font-medium text-gray-700 mb-1">
                Ảnh chi tiết (có thể chọn nhiều)
              </label>
              <p className="mb-2 text-xs font-medium text-gray-500">
                Khuyến nghị: 1200 x 675px, tỷ lệ 16:9. Chụp ngang để gallery hiển thị đều và không bị cắt nhiều.
              </p>
              <Card className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="flex flex-col gap-4">
                  <Input
                    id="multiple-images"
                    type="file"
                    accept="image/*"
                    multiple
                    size="lg"
                    className="cursor-pointer"
                    onChange={handleMultipleImagesChange}
                  />
                  {multipleImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                      {multipleImages.map((image, index) => {
                        const key =
                          typeof image === "string"
                            ? `${image}-${index}`
                            : image?.name
                              ? `${image.name}-${index}`
                              : String(index);
                        return (
                          <div key={key} className="relative group">
                            <img
                              src={
                                typeof image === "string"
                                  ? image
                                  : URL.createObjectURL(image)
                              }
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                            />
                            <button
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              onClick={() => removeMultipleImage(index)}
                              aria-label={`Xóa ảnh ${index + 1}`}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Section 3: Mô tả */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl">📝</span>
              <Typography variant="h6" className="font-semibold text-[#15803d]">
                Mô tả
              </Typography>
            </div>

            <div>
              <label htmlFor="room-description" className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả ngắn
              </label>
              <div id="room-description" className="product-dialog-quill product-dialog-quill--description">
                 <LazyQuillWrapper
                   key={`quill-description-${id || 'new'}-${open}`}
                   theme="snow"
                   value={roomDescription}
                   onChange={(val) => setIfChanged(setRoomDescription, val)}
                   placeholder="Nhập mô tả ngắn về phòng..."
                   disableImageWrap={true}
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
                 />
              </div>
            </div>

            <div>
              <label htmlFor="room-content" className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả chi tiết
              </label>
              <div id="room-content" className="product-dialog-quill product-dialog-quill--content">
                 <LazyQuillWrapper
                   key={`quill-content-${id || 'new'}-${open}`}
                   theme="snow"
                   value={roomContent}
                   onChange={(val) => setIfChanged(setRoomContent, val)}
                   placeholder="Nhập mô tả chi tiết về phòng..."
                   isSticky={true}
                   maxHeight="500px"
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
                 />
              </div>
            </div>
          </div>

          {/* Section 4: SEO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl">🔍</span>
              <Typography variant="h6" className="font-semibold text-[#15803d]">
                Thông tin SEO
              </Typography>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="seo-title" className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Title
                </label>
                <Input
                  id="seo-title"
                  size="lg"
                  className="!border-gray-300 focus:!border-blue-500 placeholder:!text-gray-600"
                  value={seoTitle}
                  onChange={handleSeoTitleChange}
                  placeholder="Tiêu đề SEO cho trang phòng..."
                />
              </div>

              <div>
                <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Description
                </label>
                <Textarea
                  id="seo-description"
                  className="!border-gray-300 focus:!border-blue-500 placeholder:!text-gray-600"
                  value={seoDescription}
                  onChange={handleSeoDescriptionChange}
                  placeholder="Mô tả SEO cho công cụ tìm kiếm..."
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="seo-keywords" className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Keywords
                </label>
                <Input
                  id="seo-keywords"
                  size="lg"
                  className="!border-gray-300 focus:!border-blue-500 placeholder:!text-gray-600"
                  value={seoKeywords}
                  onChange={handleSeoKeywordsChange}
                  placeholder="Từ khóa cách nhau bởi dấu phẩy (ví dụ: phòng cho thuê, homestay, nghỉ dưỡng)"
                />
              </div>

              <div>
                <label htmlFor="seo-image" className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Image
                </label>
                <div className="flex flex-col gap-3">
                  <Input
                    id="seo-image"
                    type="file"
                    size="lg"
                    className="file-input cursor-pointer"
                    onChange={handleSeoImageChange}
                    accept="image/*"
                  />
                  {seoImage && (
                    <div className="relative inline-block w-48 h-48 border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                      <img
                        src={
                          typeof seoImage === "string"
                            ? seoImage
                            : URL.createObjectURL(seoImage)
                        }
                        alt="SEO Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 focus:outline-none shadow-lg transition-all"
                        onClick={removeSeoImage}
                        aria-label="Xóa ảnh SEO"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Trạng thái */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl">⚙️</span>
              <Typography variant="h6" className="font-semibold text-[#15803d]">
                Trạng thái
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="checkbox-special"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  className="text-blue-500"
                />
                <label htmlFor="checkbox-special" className="flex-1 cursor-pointer">
                  <Typography variant="h6" className="font-medium text-[#15803d]">
                    ⭐ Phòng đặc biệt
                  </Typography>
                  <Typography variant="small" className="text-gray-500">
                    Đánh dấu phòng này là phòng nổi bật
                  </Typography>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="checkbox-status"
                  checked={isStatus}
                  onChange={handleStatusChange}
                  className="text-blue-500"
                />
                <label htmlFor="checkbox-status" className="flex-1 cursor-pointer">
                  <Typography variant="h6" className="font-medium text-[#15803d]">
                    ✅ Còn phòng
                  </Typography>
                  <Typography variant="small" className="text-gray-500">
                    Phòng đang còn trống và có thể cho thuê
                  </Typography>
                </label>
              </div>
            </div>
          </div>
        </CardBody>

        <style dangerouslySetInnerHTML={{ __html: `
          .product-dialog-quill {
            position: relative;
            overflow: visible;
          }
          .product-dialog-quill .quill-wrapper-container {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: visible !important;
            position: relative !important;
            z-index: 10;
          }
          .product-dialog-quill .quill-wrapper-container:focus-within,
          .product-dialog-quill .quill-wrapper-container:has(.ql-expanded) {
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
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
          .product-dialog-quill .ql-toolbar.ql-snow:has(.ql-expanded) {
            /* Keep it visible and responsive */
          }
          .product-dialog-quill .ql-snow .ql-picker-options {
            z-index: 200 !important;
          }
          .product-dialog-quill--name .ql-editor {
            min-height: 120px;
          }
          .product-dialog-quill--content .ql-editor {
            min-height: 300px;
          }
          .product-dialog-quill--price .ql-editor,
          .product-dialog-quill--equipment .ql-editor,
          .product-dialog-quill--contains .ql-editor {
            min-height: 80px;
          }
          .product-dialog-quill--description .ql-editor {
            min-height: 120px;
          }
        ` }} />

        {/* Footer với nút lưu */}
        <CardFooter className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outlined"
            onClick={handleOpen}
            className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            className="px-8 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg shadow-md hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105"
          >
            💾 Lưu thông tin
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default DialogComponent;

DialogComponent.propTypes = {
  open: PropTypes.bool.isRequired,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  handleOpen: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  dataEdit: PropTypes.shape({
    name: PropTypes.string,
    name_rich: PropTypes.string,
    content: PropTypes.string,
    description: PropTypes.string,
    equipment: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    contains: PropTypes.string,
    isSpecial: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    status: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    slug: PropTypes.string,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        image_detail: PropTypes.string,
      })
    ),
    image: PropTypes.string,
    seoTitle: PropTypes.string,
    seoDescription: PropTypes.string,
    seoKeywords: PropTypes.string,
    seoImage: PropTypes.string,
  }),
};
