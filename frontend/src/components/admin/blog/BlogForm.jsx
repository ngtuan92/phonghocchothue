import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Input, Textarea, Typography, Button } from "@material-tailwind/react";
import { MdSave, MdClose, MdCloudUpload, MdArticle, MdCategory, MdVisibility, MdPerson } from "react-icons/md";
import Cropper from "react-easy-crop";

const QuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);

import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

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

export default function BlogForm({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    category: "kien-thuc",
    status: 1,
    excerpt: "",
    content: "",
    thumbnail: "",
    authorName: "Hoa Học Trò",
    authorAvatar: "",
    ...data
  });

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
      setPreviewImage(formData.thumbnail.startsWith("http") ? formData.thumbnail : `${URL_API}${formData.thumbnail.replace(/\\/g, "/")}`);
    }
    if (formData.authorAvatar && !formData.authorAvatar.startsWith("blob:")) {
      setPreviewAvatar(formData.authorAvatar.startsWith("http") ? formData.authorAvatar : `${URL_API}${formData.authorAvatar.replace(/\\/g, "/")}`);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (imageFile) {
      submitData.thumbnailFile = imageFile;
    }
    if (avatarFile) {
      submitData.avatarFile = avatarFile;
    }
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-h-[85vh] overflow-y-auto px-6 py-4 custom-scrollbar">
      <div className="w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-gray-300 shadow-sm space-y-6 h-full">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MdArticle className="text-primary h-5 w-5" />
                  <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                    Tiêu đề bài viết
                  </Typography>
                </div>
                <Input
                  size="lg"
                  placeholder="Nhập tiêu đề ấn tượng cho bài viết…"
                  className="!border-gray-300 focus:!border-primary !bg-white transition-all duration-300 text-foreground font-medium placeholder:text-gray-400"
                  labelProps={{ className: "hidden" }}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      >
                        + Mới
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập chuyên mục mới..."
                        className="!border-gray-300 focus:!border-primary !bg-white"
                        labelProps={{ className: "hidden" }}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        autoFocus
                      />
                      <Button 
                        size="sm"
                        variant="text" 
                        className="rounded-xl text-red-500 font-bold px-4"
                        onClick={() => setIsAddingNew(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  )}
                </div>
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
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MdArticle className="text-primary h-5 w-5 rotate-90" />
                  <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                    Tóm tắt ngắn (Excerpt)
                  </Typography>
                </div>
                <Textarea
                  placeholder="Mô tả ngắn gọn nội dung bài viết để thu hút người đọc…"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={4}
                  className="!border-gray-300 focus:!border-primary !bg-white transition-all duration-300 text-foreground placeholder:text-gray-400"
                  labelProps={{ className: "hidden" }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white p-6 rounded-2xl border border-gray-300 shadow-sm space-y-5 h-full">
              <div className="flex items-center gap-2 mb-1">
                <MdCloudUpload className="text-primary h-5 w-5" />
                <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  Ảnh đại diện bài viết
                </Typography>
              </div>
              
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50/50 group transition-all hover:border-primary">
                {previewImage ? (
                  <>
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <label className="cursor-pointer bg-white text-foreground px-5 py-2 rounded-xl text-xs font-bold shadow-2xl hover:bg-gray-100 transition-all active:scale-95">
                        Thay đổi ảnh
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-10 text-center">
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                      <MdCloudUpload className="h-10 w-10 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-gray-700 uppercase">Tải ảnh bài viết</span>
                    <span className="text-[10px] text-gray-400 mt-2 font-medium">Khuyên dùng: 1200x800px</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MdSave className="text-primary h-5 w-5" />
                  <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                    Tên tác giả
                  </Typography>
                </div>
                <Input
                  size="md"
                  placeholder="Hoa Học Trò"
                  className="!border-gray-300 focus:!border-primary !bg-white text-foreground font-medium"
                  labelProps={{ className: "hidden" }}
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <MdCloudUpload className="text-primary h-5 w-5" />
                  <Typography variant="small" className="text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                    Ảnh đại diện tác giả (Avatar)
                  </Typography>
                </div>
                <Typography variant="small" className="text-[10px] text-gray-400 font-medium mb-3">
                  Khuyên dùng: Tỷ lệ 1:1 (Ví dụ: 300x300px). Hệ thống sẽ tự động cắt hình tròn.
                </Typography>
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-300 bg-gray-50 flex-shrink-0 flex items-center justify-center">
                    {previewAvatar ? (
                      <img
                        src={previewAvatar}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MdPerson className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-300 hover:border-primary text-gray-700 hover:text-primary px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95">
                    Tải ảnh
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Typography variant="small" className="text-navy-700 font-bold uppercase tracking-wider text-[11px] ml-1">
            Nội dung bài viết chi tiết
          </Typography>
          <div className="-mx-6 border border-gray-200 rounded-2xl overflow-visible bg-white shadow-sm ring-1 ring-black/5">
            <QuillWrapper
              theme="snow"
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
              className="min-h-[400px]"
              isSticky={true}
              maxHeight="500px"
              isBlogEditor={true}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
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
            className="flex items-center gap-2 px-12 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-100"
          >
            <MdSave className="h-5 w-5" />
            Lưu bài viết ngay
          </button>
        </div>
      </div>
      {/* Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
    </form>
  );
}
