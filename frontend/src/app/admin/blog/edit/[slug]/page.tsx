"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MdArrowBack, MdSave, MdClose } from "react-icons/md";
import { useBlog, useUpdateBlog } from "@/hooks/api/useBlog";
import BlogForm from "@/components/admin/blog/BlogForm";
import fetchData from "@/axios";
import { showToastSuccess, showToastError } from "@/helpers/toast";
import Loading from "@/components/admin/loading";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { data: blog, isLoading } = useBlog(slug);
  const updateBlogMutation = useUpdateBlog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveBlog = async (formData: any) => {
    if (!blog) return;
    setIsSubmitting(true);
    try {
      let responseThumbnail = formData.thumbnail;
      if (formData.thumbnailFile) {
        const uploadFd = new FormData();
        uploadFd.append("upload", formData.thumbnailFile);
        
        const finalUploadUrl = `${URL_API}api/upload/image`;
        const uploadRes = await fetchData(finalUploadUrl, "POST", uploadFd, {
          "Content-Type": "multipart/form-data",
        });
        responseThumbnail = (uploadRes as any).url;
      }

      let responseAvatar = formData.authorAvatar;
      if (formData.avatarFile) {
        const uploadFd = new FormData();
        uploadFd.append("upload", formData.avatarFile);
        
        const finalUploadUrl = `${URL_API}api/upload/image`;
        const uploadRes = await fetchData(finalUploadUrl, "POST", uploadFd, {
          "Content-Type": "multipart/form-data",
        });
        responseAvatar = (uploadRes as any).url;
      }

      const finalData = {
        ...formData,
        thumbnail: responseThumbnail,
        authorAvatar: responseAvatar,
      };
      delete finalData.thumbnailFile;
      delete finalData.avatarFile;

      await updateBlogMutation.mutateAsync({ id: blog.id, ...finalData });
      showToastSuccess("Cập nhật bài viết thành công");
    } catch (error) {
      showToastError("Cập nhật bài viết thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <p className="text-gray-600 font-bold">Không tìm thấy bài viết.</p>
        <button
          onClick={() => router.push("/admin/blog")}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 md:p-6 max-w-[1440px] mx-auto relative">
      {isSubmitting && <Loading />}
      
      {/* Simple Back button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/blog")}
          className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-primary transition-all active:scale-95"
        >
          <MdArrowBack className="h-4 w-4" />
          Quay lại danh sách
        </button>
      </div>

      {/* Form Container (No card wrapper to prevent nested cards) */}
      <BlogForm
        data={blog}
        onSave={handleSaveBlog}
        onCancel={() => router.push("/admin/blog")}
        isPage={true}
      />
    </div>
  );
}
