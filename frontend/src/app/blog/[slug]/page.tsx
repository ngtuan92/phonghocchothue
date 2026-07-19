"use client";

export const runtime = 'edge'
import { useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaUserEdit, FaChevronRight, FaHome } from "react-icons/fa";
import { useBlog } from "@/hooks/api/useBlog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NurseryHeader from "@/components/NurseryHeader";
import dynamic from "next/dynamic";
import TableOfContents from "@/components/TableOfContents";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";

const RichTextRenderer = dynamic(() => import("@/components/RichTextRenderer"), { ssr: false });
import useSEO from "@/hooks/useSEO";
import { stripHtmlAndCss } from "@/utils/seoHelpers";
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

  const canonicalUrl = "https://phonghocchothue.com";
  const buildCanonicalAssetUrl = useCallback((value: string | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    if (value.startsWith("http")) {
      return value.replace(/https?:\/\/localhost:\d+/gi, canonicalUrl).replace(/https?:\/\/api\.phonghocchothue\.com/gi, canonicalUrl);
    }
    const cleanPath = value.replaceAll("\\", "/").replace(/^\//, "");
    return `${canonicalUrl}/${cleanPath}`;
  }, []);

  const cleanTitle = stripHtmlAndCss(blog?.title || "Blog Detail");
  const cleanExcerpt = stripHtmlAndCss(blog?.excerpt || "Ký ức thanh xuân và kinh nghiệm học đường tại Đà Nẵng.");
  const seoTitle = blog ? `${cleanTitle} | Blog` : "Blog";
  const seoDescription = cleanExcerpt;
  const seoImage = useMemo(() => {
    return buildCanonicalAssetUrl(blog?.thumbnail) || "https://phonghocchothue.com/favicon.png";
  }, [blog?.thumbnail, buildCanonicalAssetUrl]);

  useSEO({
    title: seoTitle,
    description: seoDescription,
    ogType: "article",
    ogImage: seoImage,
    ogUrl: typeof window !== "undefined" ? window.location.href : "",
    structuredData: {
      data: [
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "@id": typeof window !== "undefined" ? `${window.location.href}#breadcrumb` : `https://phonghocchothue.com/blog/${slug}#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Trang chủ",
              "item": {
                "@type": "WebPage",
                "@id": "https://phonghocchothue.com/",
                "url": "https://phonghocchothue.com/",
                "name": "Trang chủ"
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Blog",
              "item": {
                "@type": "WebPage",
                "@id": "https://phonghocchothue.com/blog",
                "url": "https://phonghocchothue.com/blog",
                "name": "Blog"
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": cleanTitle,
              "item": {
                "@type": "WebPage",
                "@id": typeof window !== "undefined" ? window.location.href : `https://phonghocchothue.com/blog/${slug}`,
                "url": typeof window !== "undefined" ? window.location.href : `https://phonghocchothue.com/blog/${slug}`,
                "name": cleanTitle
              }
            }
          ]
        },
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": cleanTitle,
          "description": cleanExcerpt,
          "image": seoImage || "https://phonghocchothue.com/favicon.png",
          "datePublished": blog?.publishedAt || new Date().toISOString(),
          "author": {
            "@type": "Person",
            "name": blog?.authorName || "Admin"
          },
          "publisher": {
            "@type": "TutoringCenter",
            "@id": "https://phonghocchothue.com/#localbusiness",
            "name": "Hoa Học Trò",
            "logo": {
              "@type": "ImageObject",
              "url": "https://phonghocchothue.com/favicon.png"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": typeof window !== "undefined" ? window.location.href : `https://phonghocchothue.com/blog/${slug}`
          }
        }
      ]
    }
  });

  useEffect(() => {
    const container = document.getElementById("blog-detail-scroll-container");
    if (container) {
      container.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      const container2 = document.getElementById("blog-detail-scroll-container");
      if (container2) {
        container2.scrollTop = 0;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [slug]);

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
        <Link href="/" className="px-6 py-2 bg-[var(--color-btn-purple)] hover:bg-[var(--color-btn-purple-hover)] text-white rounded-xl font-bold transition-all duration-300 shadow-sm">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const thumbnailSrc = blog.thumbnail
    ? blog.thumbnail.startsWith("http")
      ? blog.thumbnail
      : `${URL_API}${blog.thumbnail.replaceAll("\\", "/").replace(/^\/+/, "")}`
    : null;

  const authorAvatarSrc = blog.authorAvatar
    ? blog.authorAvatar.startsWith("http")
      ? blog.authorAvatar
      : `${URL_API}${blog.authorAvatar.replaceAll("\\", "/").replace(/^\/+/, "")}`
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

      <div className="absolute inset-0 flex items-center justify-center px-[34px] py-[30px] sm:p-[70px] 1400px:p-[70px] 1700px:p-[85px]">
        <div
          id="blog-detail-scroll-container"
          className="w-full h-full rounded-[15px] sm:rounded-[30px] overflow-y-auto hide-scrollbar bg-white shadow-2xl scroll-smooth"
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
                className="w-[77px] sm:w-[110px] h-auto object-contain cursor-pointer"
                sizes="(max-width: 640px) 77px, 110px"
                quality={85}
                priority
              />
            )}
          </div>

          <main className="main-container py-8 sm:py-12">
            <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500 mb-6 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
              <Link href="/" className="flex items-center gap-1 hover:text-[#e57f7f] transition-colors">
                <FaHome size={14} />
                <span>Trang chủ</span>
              </Link>
              <span className="text-gray-300">/</span>
              <Link href="/blog" className="hover:text-[#e57f7f] transition-colors">Blog</Link>
              <span className="text-gray-300">/</span>
              <span className="text-[#563c39] font-medium truncate max-w-[300px]">{stripHtmlAndCss(blog.title)}</span>
            </nav>

            <header className="mb-2 sm:mb-4 text-center sm:text-left flex flex-col">
              <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-6 py-1 mb-2 order-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-gray-100 flex items-center justify-center text-[#563c39] overflow-hidden relative">
                    {authorAvatarSrc ? (
                      <Image
                        src={authorAvatarSrc}
                        alt={blog.authorName || "Author Avatar"}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <FaUserEdit size={14} />
                    )}
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

              <div className="order-2 w-full text-left mb-2">
                <TableOfContents html={blog.content} />
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold text-[#563c39] leading-tight sm:leading-[1.2] mt-0 mb-3 order-3">
                <RichTextRenderer 
                  html={blog.title} 
                  as="span" 
                  className="inline-rich-text" 
                  fontSize={blog.titleFontSize}
                  fontSizeMobile={blog.titleFontSizeMobile}
                  lineHeight={blog.lineHeight}
                  lineHeightMobile={blog.lineHeightMobile}
                  translateY={blog.translateY}
                  translateYMobile={blog.translateYMobile}
                  preserveNbsp
                />
              </h1>

              {blog.excerpt && (
                <div className="mb-1 sm:mb-4 px-2 sm:px-0 py-1 sm:py-1 sm:border-l-4 sm:border-[#b8c7b0] sm:pl-6 order-4">
                  <div className="text-[17px] sm:text-xl text-gray-600 sm:text-gray-700 leading-relaxed italic sm:not-italic font-medium sm:font-bold text-center sm:text-left">
                    <span className="text-[#b8c7b0] text-3xl font-serif mr-1 sm:hidden leading-none">“</span>
                    <RichTextRenderer 
                      html={blog.excerpt} 
                      as="span" 
                      className="inline-rich-text" 
                      fontSize={blog.excerptFontSize}
                      fontSizeMobile={blog.excerptFontSizeMobile}
                      lineHeight={blog.excerptLineHeight}
                      lineHeightMobile={blog.excerptLineHeightMobile}
                      translateY={blog.excerptTranslateY}
                      translateYMobile={blog.excerptTranslateYMobile}
                      preserveNbsp
                    />
                    <span className="text-[#b8c7b0] text-3xl font-serif ml-1 sm:hidden leading-none">”</span>
                  </div>
                </div>
              )}
            </header>

            <article className="blog-content-area mb-20">
              <RichTextRenderer 
                html={blog.content} 
                className="blog-content" 
                fontSize={blog.fontSize}
                fontSizeMobile={blog.fontSizeMobile}
                lineHeight={blog.lineHeight}
                lineHeightMobile={blog.lineHeightMobile}
                translateY={blog.translateY}
                translateYMobile={blog.translateYMobile}
                preserveNbsp
              />
            </article>

            <div className="flex justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-[12px] sm:text-sm text-white bg-[var(--color-btn-purple)] hover:bg-[var(--color-btn-purple-hover)] px-5 py-2 sm:px-10 sm:py-3 rounded-tl-xl rounded-br-xl transition-all duration-300 shadow-md whitespace-nowrap"
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
