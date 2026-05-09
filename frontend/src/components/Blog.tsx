"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import classNames from "classnames";
import { useBlogs, type Blog, type BlogCategory } from "@/hooks/api/useBlog";
import { FaCalendarAlt, FaUserEdit, FaBookOpen, FaSeedling, FaArrowRight } from "react-icons/fa";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

type FilterTab = "all" | string;

const getCategoryConfig = (category: string) => {
  const configs: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
    "kien-thuc": {
      label: "Kiến thức",
      icon: <FaBookOpen size={10} />,
      bg: "bg-[#799f85]",
    },
    "kinh-nghiem": {
      label: "Kinh nghiệm",
      icon: <FaSeedling size={10} />,
      bg: "bg-[#799f85]",
    },
  };

  return configs[category] || {
    label: category.charAt(0).toUpperCase() + category.slice(1), // Viết hoa chữ cái đầu
    icon: <FaSeedling size={10} />, // Icon mặc định
    bg: "bg-[#799f85]",
  };
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function BlogCardSkeleton() {
  return (
    <div className="rounded-tl-2xl rounded-br-2xl overflow-hidden border border-[#799f85]/20 animate-pulse">
      <div className="bg-gray-200 aspect-video w-full" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-2/5" />
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-8 bg-gray-200 rounded-tl-xl rounded-br-xl w-28 mt-2" />
      </div>
    </div>
  );
}

function BlogCard({ blog }: { blog: Blog }) {
  const cat = getCategoryConfig(blog.category);

  const thumbnailSrc =
    blog.thumbnail
      ? blog.thumbnail.startsWith("http")
        ? blog.thumbnail
        : `${URL_API}${blog.thumbnail.replaceAll("\\", "/")}`
      : null;

  return (
    <div className="group rounded-tl-2xl rounded-br-2xl overflow-hidden border border-[#799f85]/25 flex flex-col transition-shadow duration-300 hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-gray-100 flex-shrink-0">
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={blog.title}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            quality={80}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#fdf6f5] to-[#e8d5cc]">
            <FaBookOpen className="text-[#b8c7b0]" size={40} />
          </div>
        )}
        <span
          className={classNames(
            "absolute top-3 left-3 flex items-center gap-1 text-white text-[10px] font-semibold px-2 py-1 rounded-full",
            cat.bg
          )}
        >
          {cat.icon}
          {cat.label}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="flex items-center gap-3 text-[11px] text-[#563c39]/60 italic mb-2">
          <span className="flex items-center gap-1">
            <FaCalendarAlt size={9} />
            {formatDate(blog.publishedAt)}
          </span>
          <span className="flex items-center gap-1">
            <FaUserEdit size={9} />
            {blog.authorName || "Hoa Học Trò"}
          </span>
        </p>

        <h3 className="text-xs sm:text-base font-bold text-[#563c39] line-clamp-2 mb-1.5 leading-snug">
          {blog.title}
        </h3>

        <p className="text-[11px] sm:text-base text-gray-700 raleway !font-normal line-clamp-3 flex-1">
          {blog.excerpt}
        </p>

        <Link
          href={`/blog/${blog.slug}`}
          className="mt-4 self-start inline-flex items-center gap-2 text-xs sm:text-sm text-white bg-[#b8c7b0] hover:bg-[#e57f7f] px-4 py-2 rounded-tl-xl rounded-br-xl transition-all duration-300 ease-in-out hover:rounded-bl-xl hover:rounded-tr-xl hover:rounded-br-none hover:rounded-tl-none"
        >
          Đọc tiếp
          <FaArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}

export default function Blog() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<{key: string, label: string}[]>([
    { key: "all", label: "Tất cả" },
    { key: "kien-thuc", label: "Kiến thức" },
    { key: "kinh-nghiem", label: "Kinh nghiệm" },
  ]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 3;
  
  const blogHeading = useConfigContentByKey("blog-heading");

  const { data, isLoading, isFetching } = useBlogs({
    category: activeTab === "all" ? undefined : activeTab,
    page: page,
    limit: limit,
    status: 1
  });

  useEffect(() => {
    fetch(`${URL_API}api/blog/categories?status=1`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data.length > 0) {
          const defaultTabs = [
            { key: "all", label: "Tất cả" },
            { key: "kien-thuc", label: "Kiến thức" },
            { key: "kinh-nghiem", label: "Kinh nghiệm" },
          ];
          const dynamicTabs = res.data
            .filter((cat: string) => cat !== "kien-thuc" && cat !== "kinh-nghiem")
            .map((cat: string) => ({
              key: cat,
              label: cat.charAt(0).toUpperCase() + cat.slice(1)
            }));
          
          setCategories([...defaultTabs, ...dynamicTabs]);
        }
      })
      .catch(err => console.error("Lỗi tải danh mục:", err));
  }, []);

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setBlogs(data.data);
      } else {
        setBlogs(prev => {
          const newBlogs = data.data.filter((nb: Blog) => !prev.some(pb => pb.id === nb.id));
          return [...prev, ...newBlogs];
        });
      }
      
      const totalPages = data.pagination?.totalPages || 0;
      setHasMore(page < totalPages);
    }
  }, [data, page]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
    setBlogs([]);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <section id="blog" className="mt-12 sm:mt-24 md:mt-36 mb-12 sm:mb-24 main-container">
      <div className="mb-10 text-center">
        <RichTextRenderer 
          html={blogHeading} 
          className="text-center"
          fallback={
            <>
              <h2 className="font-cursive text-2xl sm:text-7xl text-[#563c39] mb-4">Kiến thức và kinh nghiệm thuê phòng dạy học</h2>
            </>
          }
        />
        <div className="flex items-center justify-center gap-2 mt-7">
          <span className="h-px w-12 bg-[#b8c7b0]" />
          <span className="text-[#b8c7b0] text-xs">✿</span>
          <span className="h-px w-12 bg-[#b8c7b0]" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
        {categories.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={classNames(
              "text-xs sm:text-sm px-4 py-1.5 transition-all duration-300 border",
              activeTab === tab.key
                ? "bg-[#e57f7f] border-[#e57f7f] text-white rounded-tl-xl rounded-br-xl"
                : "bg-transparent border-[#799f85]/40 text-[#563c39] rounded-tl-xl rounded-br-xl hover:border-[#e57f7f] hover:text-[#e57f7f]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((blog) => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
        {isLoading && page === 1 && Array.from({ length: 3 }).map((_, i) => <BlogCardSkeleton key={i} />)}
        {isFetching && page > 1 && Array.from({ length: 3 }).map((_, i) => <BlogCardSkeleton key={i} />)}
      </div>

      {!isLoading && blogs.length === 0 && (
        <p className="text-center raleway text-sm text-[#563c39]/60 italic mt-8">
          Chưa có bài viết nào trong danh mục này.
        </p>
      )}

      {hasMore && blogs.length > 0 && (
        <div className="flex justify-center mt-10">
          <button
            onClick={handleLoadMore}
            disabled={isFetching}
            className="inline-flex items-center gap-2 text-sm text-white bg-[#563c39] hover:bg-[#e57f7f] px-6 py-2.5 rounded-tl-xl rounded-br-xl transition-all duration-300 ease-in-out hover:rounded-bl-xl hover:rounded-tr-xl hover:rounded-br-none hover:rounded-tl-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? "Đang tải..." : "Xem thêm"}
            {!isFetching && <FaArrowRight size={12} />}
          </button>
        </div>
      )}
    </section>
  );
}
