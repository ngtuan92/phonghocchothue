"use client";

export const runtime = "edge";

import { useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaUserEdit, FaChevronRight, FaHome } from "react-icons/fa";
import { useBlog } from "@/hooks/api/useBlog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NurseryHeader from "@/components/NurseryHeader";
import RichTextRenderer from "@/components/RichTextRenderer";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import useSEO from "@/hooks/useSEO";
import Loading from "@/components/admin/loading";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function BlogDetail() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { data: blog, isLoading } = useBlog(slug);

  const colorBg = useConfigContentByKey("color-bg");
  const background = useConfigContentByKey("background");
  const imgIcon = useConfigContentByKey("logo-page-detail");
  const pageStyle = colorBg ? { backgroundColor: colorBg } : {};

  const goToHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const iconHeader = useMemo(() => {
    if (typeof imgIcon === "string" && imgIcon.trim() !== "") {
      return `${URL_API}${imgIcon.replaceAll("\\", "/")}`;
    }
    return null;
  }, [imgIcon]);

  const seoTitle = blog ? `${blog.title} | Blog` : "Blog";
  const seoDescription = blog?.excerpt || "Kiến thức và kinh nghiệm thuê phòng dạy học tại Đà Nẵng.";
  const seoImage = blog?.thumbnail ? (blog.thumbnail.startsWith("http") ? blog.thumbnail : `${URL_API}${blog.thumbnail.replaceAll("\\", "/")}`) : undefined;

  useSEO({
    title: seoTitle,
    description: seoDescription,
    ogType: "article",
    ogImage: seoImage,
    ogUrl: typeof window !== "undefined" ? window.location.href : "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
        <h1 className="text-4xl font-bold text-[#563c39] mb-4">404</h1>
        <p className="text-gray-600 mb-8">Xin lỗi, bài viết bạn đang tìm kiếm không tồn tại.</p>
        <Link href="/" className="px-6 py-2 bg-[#563c39] text-white rounded-xl font-bold">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const thumbnailSrc = blog.thumbnail
    ? blog.thumbnail.startsWith("http")
      ? blog.thumbnail
      : `${URL_API}${blog.thumbnail.replaceAll("\\", "/")}`
    : null;

  return (
    <div className="overflow-hidden">
      {background && (
        <div className="fixed top-0 left-0 w-full h-screen -z-10">
          <Image
            src={`${URL_API}${background.replaceAll("\\", "/")}`}
            alt="Background"
            fill
            className="object-cover"
            sizes="100vw"
            priority
            quality={85}
          />
        </div>
      )}

      <div className="relative sm:absolute sm:inset-0 flex items-center justify-center p-7 sm:p-6 md:p-6 lg:p-[40px] xl:p-[50px]">
        <div
          className="w-full h-full rounded-[15px] sm:rounded-[30px] overflow-y-auto hide-scrollbar bg-white shadow-2xl"
          style={pageStyle}
        >
          <Header />

          <div
            className={`flex flex-col justify-center items-center px-2 mt-16 sm:mt-4 z-2 sm:h-auto relative`}
          >
            {iconHeader && (
              <Image
                onClick={goToHome}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToHome();
                  }
                }}
                tabIndex={0}
                src={iconHeader}
                alt="logo"
                width={110}
                height={120}
                className="w-[77px] h-[86px] sm:w-[110px] sm:h-[120px] cursor-pointer"
                sizes="(max-width: 640px) 77px, 110px"
                quality={85}
                priority
              />
            )}
          </div>

          <main className="max-w-4xl mx-auto px-5 sm:px-10 py-8 sm:py-12">
            <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500 mb-10 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
              <Link href="/" className="flex items-center gap-1 hover:text-[#e57f7f] transition-colors">
                <FaHome size={14} />
                <span>Trang chủ</span>
              </Link>
              <span className="text-gray-300">/</span>
              <Link href="/blog" className="hover:text-[#e57f7f] transition-colors">Blog</Link>
              <span className="text-gray-300">/</span>
              <span className="text-[#563c39] font-medium truncate max-w-[300px]">{blog.title}</span>
            </nav>

            <header className="mb-12 text-center sm:text-left">
              <div className="mb-6">
                <span className={`text-[11px] font-bold uppercase tracking-[2px] ${blog.category === 'kien-thuc' ? 'text-[#799f85]' : 'text-[#e57f7f]'
                  }`}>
                  {blog.category === 'kien-thuc' ? 'Kiến thức' : 'Kinh nghiệm'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold text-[#563c39] leading-tight sm:leading-[1.2] mb-10">
                {blog.title}
              </h1>

              <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-4 sm:gap-10 py-4 sm:border-y sm:border-gray-100 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-gray-100 flex items-center justify-center text-[#563c39]">
                    <FaUserEdit size={14} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#563c39] text-sm sm:text-base">{blog.authorName}</span>
                    <span className="sm:hidden text-gray-300">•</span>
                    <span className="sm:hidden text-xs text-gray-500">{new Date(blog.publishedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                  <FaCalendarAlt size={12} className="text-gray-400" />
                  <span>Ngày đăng: {new Date(blog.publishedAt).toLocaleDateString("vi-VN", {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })}</span>
                </div>
              </div>

              {blog.excerpt && (
                <div className="mb-12 px-2 sm:px-0 py-4 sm:py-1 sm:border-l-4 sm:border-[#b8c7b0] sm:pl-6">
                  <p className="text-[17px] sm:text-xl text-gray-600 sm:text-gray-700 leading-relaxed italic sm:not-italic font-medium sm:font-bold text-center sm:text-left">
                    <span className="text-[#b8c7b0] text-3xl font-serif mr-1 sm:hidden leading-none">“</span>
                    {blog.excerpt}
                    <span className="text-[#b8c7b0] text-3xl font-serif ml-1 sm:hidden leading-none">”</span>
                  </p>
                </div>
              )}
            </header>

            <article className="blog-content-area mb-20">
              <RichTextRenderer html={blog.content} className="blog-content" />
            </article>

            <div className="pt-10 border-t border-gray-100 flex justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-white bg-[#563c39] hover:bg-[#e57f7f] px-10 py-3 rounded-tl-xl rounded-br-xl transition-all duration-300 shadow-md"
              >
                Quay lại danh sách bài viết
              </Link>
            </div>
          </main>

          <NurseryHeader />
          <Footer />
        </div>
      </div>
    </div>
  );
}
