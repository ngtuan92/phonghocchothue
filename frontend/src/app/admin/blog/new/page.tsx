"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MdArrowBack, MdSave, MdClose } from "react-icons/md";
import { useCreateBlog } from "@/hooks/api/useBlog";
import BlogForm from "@/components/admin/blog/BlogForm";
import fetchData from "@/axios";
import { showToastSuccess, showToastError } from "@/helpers/toast";
import Loading from "@/components/admin/loading";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

export default function NewBlogPage() {
  const router = useRouter();
  const createBlogMutation = useCreateBlog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveBlog = async (formData: any) => {
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

      await createBlogMutation.mutateAsync(finalData);
      showToastSuccess("Thêm bài viết thành công");
      router.push("/admin/blog");
      return finalData;
    } catch (error: any) {
      const message = error?.response?.data?.message;
      showToastError(message ? `Thêm bài viết thất bại: ${message}` : "Thêm bài viết thất bại");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="blog-edit-page w-full h-full p-2 md:p-6 relative">
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
        data={null}
        onSave={handleSaveBlog}
        onCancel={() => router.push("/admin/blog")}
        isPage={true}
      />
    </div>
  );
}
