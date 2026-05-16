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
    label: category.charAt(0).toUpperCase() + category.slice(1),
    icon: <FaSeedling size={10} />,
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
    <div className="group rounded-tl-2xl rounded-br-2xl overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-md bg-white">
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

function FeaturedBlogCard({ blog }: { blog: Blog }) {
  const cat = getCategoryConfig(blog.category);
  const thumbnailSrc = blog.thumbnail
    ? blog.thumbnail.startsWith("http")
      ? blog.thumbnail
      : `${URL_API}${blog.thumbnail.replaceAll("\\", "/")}`
    : null;

  return (
    <div className="group relative rounded-tl-[2rem] rounded-br-[2rem] overflow-hidden flex flex-col lg:flex-row bg-white transition-all duration-500 hover:shadow-2xl mb-12">
      <div className="relative w-full lg:w-3/5 aspect-video lg:aspect-auto min-h-[300px] overflow-hidden">
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={blog.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#fdf6f5] to-[#e8d5cc]">
            <FaBookOpen className="text-[#b8c7b0]" size={60} />
          </div>
        )}
        <div className="absolute top-6 left-6 z-10">
          <span className={classNames("flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg", cat.bg)}>
            {cat.icon}
            {cat.label}
          </span>
        </div>
      </div>

      <div className="w-full lg:w-2/5 p-8 lg:p-12 flex flex-col justify-center">
        <div className="flex items-center gap-4 text-xs text-[#563c39]/60 italic mb-6">
          <span className="flex items-center gap-1.5">
            <FaCalendarAlt size={12} className="text-[#799f85]" />
            {formatDate(blog.publishedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <FaUserEdit size={12} className="text-[#799f85]" />
            {blog.authorName || "Hoa Học Trò"}
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-bold text-[#563c39] mb-6 leading-tight group-hover:text-[#e57f7f] transition-colors duration-300">
          {blog.title}
        </h2>

        <p className="text-gray-600 raleway text-sm sm:text-base mb-8 line-clamp-4 leading-relaxed">
          {blog.excerpt}
        </p>

        <Link
          href={`/blog/${blog.slug}`}
          className="self-start inline-flex items-center gap-3 text-sm font-bold text-white bg-[#563c39] hover:bg-[#e57f7f] px-8 py-4 rounded-tl-2xl rounded-br-2xl transition-all duration-300 hover:rounded-bl-2xl hover:rounded-tr-2xl hover:rounded-br-none hover:rounded-tl-none"
        >
          Đọc bài viết nổi bật
          <FaArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

interface BlogProps {
  isHomePage?: boolean;
  currentCategory?: string;
  noContainer?: boolean;
  showFeatured?: boolean;
  hideTabs?: boolean;
}

export default function Blog({ 
  isHomePage = false, 
  currentCategory = "all",
  noContainer = false,
  showFeatured = false,
  hideTabs = false
}: BlogProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>(currentCategory);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([
    { key: "all", label: "Tất cả bài viết" },
  ]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [limit, setLimit] = useState(isHomePage ? 3 : 6);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        if (!isHomePage) {
          setLimit(mobile ? 3 : 12);
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isHomePage]);

  const blogHeading = useConfigContentByKey("blog-heading");

  const { data, isLoading, isFetching } = useBlogs({
    category: activeTab === "all" ? undefined : activeTab,
    page: page,
    limit: limit,
    status: 1,
  });

  useEffect(() => {
    setActiveTab(currentCategory);
    setPage(1);
    setBlogs([]);
  }, [currentCategory]);

  const getCategoryLabel = (cat: string) => {
    if (!cat) return "";
    return decodeURIComponent(cat);
  };

  useEffect(() => {
    fetch(`${URL_API}api/blog/categories?status=1`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          const dynamicTabs = res.data.map((cat: string) => ({
            key: cat,
            label: getCategoryLabel(cat),
          }));

          setCategories([{ key: "all", label: "Tất cả bài viết" }, ...dynamicTabs]);
        }
      })
      .catch((err) => console.error("Lỗi tải danh mục:", err));
  }, []);

  useEffect(() => {
    if (data?.data) {
      if (isMobile || isHomePage) {
        if (page === 1) {
          setBlogs(data.data);
        } else {
          setBlogs((prev) => {
            const newBlogs = data.data.filter((nb: Blog) => !prev.some((pb) => pb.id === nb.id));
            return [...prev, ...newBlogs];
          });
        }
      } else {
        setBlogs(data.data);
        if (page > 1) {
          const element = document.getElementById("blog-list-start");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }

      const totalPages = data.pagination?.totalPages || 0;
      setHasMore(page < totalPages);
    }
  }, [data, page, isMobile, isHomePage]);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <section id="blog" className={classNames("mb-16 sm:mb-24", !noContainer && "main-container", isHomePage ? "mt-12 sm:mt-24 md:mt-36" : "mt-0")}>
      <div id="blog-list-start" className="absolute -translate-y-32" />
      
      {isHomePage && (
        <div className="mb-14 sm:mb-10 text-center blog-hero-title">
          <RichTextRenderer
            html={blogHeading}
            className="text-center"
          />
          <div className="flex items-center justify-center gap-4 mt-4 sm:mt-2">
            <div className="h-px w-12 sm:w-60 bg-[#b8c7b0]/40" />
            <span className="text-[#b8c7b0] text-[6px] sm:text-base blog-flower-icon">✿</span>
            <div className="h-px w-12 sm:w-60 bg-[#b8c7b0]/40" />
          </div>
        </div>
      )}

      {!hideTabs && (
        <div className="flex items-center sm:justify-center gap-2 sm:gap-3 mb-8 overflow-x-auto hide-scrollbar px-2 sm:px-0 whitespace-nowrap">
          {categories.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/blog" : `/blog/danh-muc/${tab.key}`}
              className={classNames(
                "text-xs sm:text-sm px-4 py-1.5 transition-all duration-300 border",
                activeTab === tab.key
                  ? "bg-[#e57f7f] border-[#e57f7f] text-white rounded-tl-xl rounded-br-xl"
                  : "bg-transparent border-[#799f85]/40 text-[#563c39] rounded-tl-xl rounded-br-xl hover:border-[#e57f7f] hover:text-[#e57f7f]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        {showFeatured && page === 1 && blogs.length > 0 && (
          <FeaturedBlogCard blog={blogs[0]} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(showFeatured && page === 1 && !isMobile ? blogs.slice(1) : blogs).map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
          {(isLoading || isFetching) && Array.from({ length: isMobile ? 1 : 3 }).map((_, i) => <BlogCardSkeleton key={i} />)}
        </div>
      </div>

      {!isLoading && !isFetching && blogs.length === 0 && (
        <p className="text-center raleway text-sm text-[#563c39]/60 italic mt-8">
          Chưa có bài viết nào trong danh mục này.
        </p>
      )}

      {isHomePage ? (
        <div className="flex justify-center mt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-white bg-[#563c39] hover:bg-[#e57f7f] px-10 py-3 rounded-tl-xl rounded-br-xl transition-all duration-300 shadow-md hover:rounded-bl-xl hover:rounded-tr-xl hover:rounded-br-none hover:rounded-tl-none"
          >
            Xem tất cả bài viết
            <FaArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <>
          {isMobile ? (
            hasMore && blogs.length > 0 && (
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
            )
          ) : (
            totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1 || isFetching}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-[#fdf6f5] disabled:opacity-30 transition-colors"
                >
                  <FaArrowRight size={12} className="rotate-180" />
                </button>
                
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      disabled={isFetching}
                      className={classNames(
                        "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                        page === i + 1
                          ? "bg-[#563c39] text-white shadow-lg"
                          : "bg-white border border-gray-100 text-[#563c39] hover:border-[#e57f7f]"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || isFetching}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-[#fdf6f5] disabled:opacity-30 transition-colors"
                >
                  <FaArrowRight size={12} />
                </button>
              </div>
            )
          )}
        </>
      )}
    </section>
  );
}
