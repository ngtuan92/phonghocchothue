import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Input, Textarea, Typography, Button } from "@material-tailwind/react";
import { MdSave, MdClose, MdCloudUpload, MdArticle, MdCategory, MdVisibility } from "react-icons/md";

const QuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);

import "react-quill-new/dist/quill.snow.css";


const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function BlogForm({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    category: "kien-thuc",
    status: 1,
    excerpt: "",
    content: "",
    thumbnail: "",
    authorName: "Hoa Học Trò",
    ...data
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (formData.thumbnail && !formData.thumbnail.startsWith("blob:")) {
      setPreviewImage(formData.thumbnail.startsWith("http") ? formData.thumbnail : `${URL_API}${formData.thumbnail.replace(/\\/g, "/")}`);
    }
  }, [formData.thumbnail]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (imageFile) {
      submitData.thumbnailFile = imageFile;
    }
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-h-[85vh] overflow-y-auto px-4 py-2 custom-scrollbar">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-300 shadow-sm space-y-6">
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
                      <option value="kien-thuc">Kiến thức</option>
                      <option value="kinh-nghiem">Kinh nghiệm</option>
                      {categories
                        .filter(cat => cat !== 'kien-thuc' && cat !== 'kinh-nghiem')
                        .map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      }
                      {formData.category && 
                       formData.category !== 'kien-thuc' && 
                       formData.category !== 'kinh-nghiem' && 
                       !categories.includes(formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
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

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-300 shadow-sm space-y-5">
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
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Typography variant="small" className="text-navy-700 font-bold uppercase tracking-wider text-[11px] ml-1">
          Nội dung bài viết chi tiết
        </Typography>
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
          <QuillWrapper
            theme="snow"
            value={formData.content}
            onChange={(val) => setFormData({ ...formData, content: val })}
            className="min-h-[500px]"
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 12px !important;
          background: #f8fafc !important;
        }
        .ql-container.ql-snow {
          border: none !important;
        }
        .ql-editor {
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          padding: 24px !important;
        }
      `}</style>
    </form>
  );
}
