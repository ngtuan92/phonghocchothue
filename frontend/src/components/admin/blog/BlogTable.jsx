import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Card from "../card";
import { 
  MdAdd, MdEdit, MdDelete, MdSearch, MdClose, MdLibraryBooks, 
  MdNavigateBefore, MdNavigateNext, MdPerson, MdCalendarToday, 
  MdFiberManualRecord 
} from "react-icons/md";
import { useBlogs, useCreateBlog, useUpdateBlog, useDeleteBlog } from "@/hooks/api/useBlog";
import Loading from "@/components/admin/loading";
import { showToastSuccess, showToastError } from "@/helpers/toast";
import { handleInvalidToken } from "@/utils/helpers";
import fetchData from "@/axios";

const Dialog = dynamic(() => import("@/components/admin/dialog"), { ssr: false });
const Confirm = dynamic(() => import("@/components/admin/confirm"), { ssr: false });
const BlogForm = dynamic(() => import("./BlogForm"), { ssr: false });

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function BlogTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: blogData, isLoading, refetch, isFetching } = useBlogs({
    page,
    limit: 8,
    status: 'all'
  });

  const deleteBlogMutation = useDeleteBlog();
  const createBlogMutation = useCreateBlog();
  const updateBlogMutation = useUpdateBlog();

  const handleOpenForm = (blog = null) => {
    setSelectedBlog(blog);
    setOpenForm(true);
  };

  const handleOpenConfirm = (blog) => {
    setSelectedBlog(blog);
    setOpenConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBlog) return;
    try {
      await deleteBlogMutation.mutateAsync(selectedBlog.id);
      showToastSuccess("Xóa bài viết thành công");
      setOpenConfirm(false);
      refetch();
    } catch (error) {
      showToastError("Xóa bài viết thất bại");
    }
  };

  const handleSaveBlog = async (formData) => {
    setIsSubmitting(true);
    try {

      let responseThumbnail = formData.thumbnail;
      if (formData.thumbnailFile) {
        const uploadFd = new FormData();
        uploadFd.append('upload', formData.thumbnailFile);
        
        const finalUploadUrl = `${URL_API}api/upload/image`;

        const uploadRes = await fetchData(finalUploadUrl, "POST", uploadFd, {
          "Content-Type": "multipart/form-data",
        });
        responseThumbnail = uploadRes.url;
      }

      const finalData = {
        ...formData,
        thumbnail: responseThumbnail
      };
      delete finalData.thumbnailFile;

      if (selectedBlog) {
        await updateBlogMutation.mutateAsync({ id: selectedBlog.id, ...finalData });
        showToastSuccess("Cập nhật bài viết thành công");
      } else {
        await createBlogMutation.mutateAsync(finalData);
        showToastSuccess("Thêm bài viết thành công");
      }
      setOpenForm(false);
      refetch();
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError(selectedBlog ? "Cập nhật bài viết thất bại" : "Thêm bài viết thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const blogs = blogData?.data || [];
  const pagination = blogData?.pagination || { totalPages: 1, currentPage: 1 };

  return (
    <div className="w-full h-full p-2 md:p-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-6">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-lightPrimary rounded-lg">
                <MdLibraryBooks className="text-primary h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Quản lý Blog & Tin tức</h2>
            </div>
            <p className="text-xs text-gray-500 font-medium ml-10">Danh sách các bài viết</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm tên bài viết, tác giả…"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm text-foreground focus:outline-none focus:border-primary transition-all placeholder:text-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => handleOpenForm(null)}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all active:scale-95 shadow-sm whitespace-nowrap"
            >
              <MdAdd className="h-5 w-5" />
              Viết bài mới
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-300 bg-white min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">Đang tải dữ liệu…</span>
            </div>
          )}

          {blogs.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center py-20">
              <MdLibraryBooks className="h-12 w-12 text-gray-200 mb-2" />
              <p className="text-gray-600 font-bold text-sm">Kho dữ liệu đang trống</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-start py-4 px-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Ảnh bìa</th>
                  <th className="text-start py-4 px-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Thông tin bài viết</th>
                  <th className="text-start py-4 px-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Chuyên mục</th>
                  <th className="text-start py-4 px-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Trạng thái</th>
                  <th className="text-end py-4 px-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {blogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="h-12 w-20 rounded-lg bg-gray-100 overflow-hidden border border-gray-100">
                        {blog.thumbnail ? (
                          <img
                            src={blog.thumbnail.startsWith('http') ? blog.thumbnail : `${URL_API}${blog.thumbnail.replace(/\\/g, "/")}`}
                            alt={blog.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[9px] text-gray-300 font-bold uppercase">No Image</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-[300px]">
                        <p className="text-sm font-bold text-foreground line-clamp-1 mb-0.5" title={blog.title}>
                          {blog.title}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-600 font-medium">
                          <div className="flex items-center gap-1">
                            <MdPerson className="h-3.5 w-3.5 text-primary" />
                            <span>{blog.authorName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MdCalendarToday className="h-3 w-3 text-primary" />
                            <span>{new Date(blog.publishedAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const catMap = {
                          'kien-thuc': { label: 'Kiến thức', cls: 'bg-blue-50 text-blue-500' },
                          'kinh-nghiem': { label: 'Kinh nghiệm', cls: 'bg-orange-50 text-orange-500' },
                        };
                        const cat = catMap[blog.category];
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cat ? cat.cls : 'bg-purple-50 text-purple-500'
                          }`}>
                            {cat ? cat.label : blog.category.charAt(0).toUpperCase() + blog.category.slice(1)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                        blog.status === 1 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <MdFiberManualRecord className={`h-2 w-2 ${blog.status === 1 ? 'text-green-500' : 'text-gray-400'}`} />
                        {blog.status === 1 ? 'Đang hiện' : 'Đang ẩn'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-end">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={() => handleOpenForm(blog)}
                          className="p-2 text-foreground hover:text-primary hover:bg-lightPrimary rounded-lg transition-all"
                          title="Sửa"
                        >
                          <MdEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenConfirm(blog)}
                          className="p-2 text-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa"
                        >
                          <MdDelete className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => prev - 1)}
              className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              <MdNavigateBefore className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    page === i + 1 
                      ? 'bg-primary text-white' 
                      : 'bg-white border border-gray-100 text-foreground hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage(prev => prev + 1)}
              className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              <MdNavigateNext className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {openForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={() => setOpenForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-6xl shadow-2xl z-10 overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center px-8 py-4 border-b border-gray-50">
              <h2 className="text-lg font-bold text-foreground">
                {selectedBlog ? "Chỉnh sửa bài viết" : "Soạn thảo bài viết mới"}
              </h2>
              <button onClick={() => setOpenForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all group">
                <MdClose className="h-5 w-5 text-gray-700 group-hover:text-red-500" />
              </button>
            </div>
            <div className="p-6">
              <BlogForm
                data={selectedBlog}
                onSave={handleSaveBlog}
                onCancel={() => setOpenForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      <Confirm
        open={openConfirm}
        onConfirm={handleConfirmDelete}
        handleOpen={() => setOpenConfirm(false)}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa bài viết này không?"
      />
    </div>
  );
}
