"use client";

export const runtime = 'edge'
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import classNames from "classnames";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NurseryHeader from "@/components/NurseryHeader";
import Blog from "@/components/Blog";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import useSEO from "@/hooks/useSEO";
import Image from "next/image";
import Link from "next/link";
import CategorySidebar from "@/components/CategorySidebar";
import { FaHome, FaChevronRight, FaBookOpen, FaTags, FaThLarge, FaTimes } from "react-icons/fa";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function BlogCategoryPage() {
  const params = useParams();
  const category = decodeURIComponent(params.category as string);

  const colorBg = useConfigContentByKey("color-bg");
  const background = useConfigContentByKey("background");
  const logo = useConfigContentByKey("logo");
  const pageStyle = colorBg ? { backgroundColor: colorBg } : {};

  const [categories, setCategories] = useState<{ key: string; label: string }[]>([
    { key: "all", label: "Tất cả" },
  ]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getCategoryLabel = (cat: string) => {
    if (!cat) return "Danh mục";
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

          setCategories([{ key: "all", label: "Tất cả" }, ...dynamicTabs]);
        }
      })
      .catch((err) => console.error("Lỗi tải danh mục:", err));
  }, []);

  const displayCategory = getCategoryLabel(category);

  useSEO({
    title: `${displayCategory} - Blog | ChoThuePhongHoc.com`,
    description: `Danh sách bài viết thuộc danh mục ${displayCategory}. Ký ức thanh xuân và kinh nghiệm học đường tại Đà Nẵng.`,
    ogType: "website",
  });

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
          id="main-scroll-container"
          className="w-full h-full rounded-[15px] sm:rounded-[30px] overflow-y-auto hide-scrollbar"
          style={pageStyle}
        >
          <Header />

          <main className="min-h-screen">
            <div className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 overflow-hidden">
              <div className="main-container relative z-10">
                <div className="flex flex-col items-center">
                  {logo && (
                    <div className="mb-6 flex justify-center w-full">
                      <Link href="/" className="transition-transform hover:scale-105 active:scale-95 duration-300">
                        <Image
                          src={`${URL_API}${logo.replace(/\\/g, "/")}`}
                          alt="Logo"
                          width={120}
                          height={120}
                          className="w-[70px] md:w-[100px] lg:w-[120px] h-auto object-contain drop-shadow-xl"
                          priority
                        />
                      </Link>
                    </div>
                  )}

                  <div className="w-full flex flex-col items-center gap-4 text-center">
                    <nav className="hidden sm:flex self-start items-center gap-2 text-xs sm:text-sm text-gray-600 raleway">
                      <Link href="/" className="flex items-center gap-1.5 hover:text-[#e57f7f] transition-colors">
                        <FaHome size={15} className="-translate-y-0.5" />
                        <span>Trang chủ</span>
                      </Link>
                      <span className="text-gray-400">/</span>
                      <Link href="/blog" className="hover:text-[#e57f7f] transition-colors">Blog</Link>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-600 capitalize">{displayCategory}</span>
                    </nav>

                    <div className="flex flex-col items-center mb-0 blog-header-dynamic">
                      <h1 className="text-4xl sm:text-7xl font-bold text-[#563c39] raleway tracking-tighter leading-none text-center">
                        {displayCategory}<span className="text-[#e57f7f]">.</span>
                      </h1>
                    </div>

                    <p className="w-full text-xs sm:text-sm text-gray-500 leading-relaxed raleway text-center blog-header-dynamic">
                      Khám phá các bài viết chuyên sâu về chủ đề {displayCategory} tại ChoThuePhongHoc.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="main-container pt-0 pb-4 sm:pt-0 sm:pb-8">
              <div className="lg:hidden sticky top-[36px] sm:top-0 z-[40] -mx-4 px-4 py-2 bg-transparent mb-2">
                <div className="relative w-full flex items-center">
                  <div className="flex overflow-x-auto gap-2 pb-1.5 hide-scrollbar whitespace-nowrap scroll-smooth flex-1">
                    {categories.map((cat) => (
                      <Link
                        key={cat.key}
                        href={cat.key === "all" ? "/blog" : `/blog/danh-muc/${encodeURIComponent(cat.key)}`}
                        className={classNames(
                          "whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-300 border",
                          category === cat.key
                            ? "bg-[#563c39] text-white border-[#563c39] shadow-md shadow-[#563c39]/20"
                            : "bg-white/80 backdrop-blur-md text-gray-600 border-[#799f85]/20 hover:bg-[#fdf6f5]"
                        )}
                      >
                        {cat.label}
                      </Link>
                    ))}
                    {/* Spacer at the end to allow scrolling past the gradient */}
                    <div className="flex-shrink-0 w-14" />
                  </div>

                  {/* Dynamic Fade-out Gradient Overlay on the right */}
                  <div 
                    className="absolute right-0 top-0 bottom-1.5 pointer-events-none z-10 w-14 transition-all duration-300"
                    style={{
                      background: `linear-gradient(to left, ${colorBg || '#faf8f5'} 40%, transparent)`
                    }}
                  />

                  {/* Sticky Grid Button */}
                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="absolute right-0 top-0 bottom-1.5 my-auto z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/95 backdrop-blur-md border border-[#563c39]/10 text-[#563c39] shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-90 transition-all duration-200"
                    aria-label="Tất cả danh mục"
                  >
                    <FaThLarge size={13} className="text-[#563c39]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-16">
                {/* Sidebar - Hidden on Mobile, Visible on Desktop (lg+) */}
                <aside className="hidden lg:block lg:w-[20%]">
                  <CategorySidebar currentCategory={category} />
                </aside>

                <div className="w-full lg:w-[80%]">
                  <Blog isHomePage={false} currentCategory={category} noContainer={true} showFeatured={false} hideTabs={true} />
                </div>
              </div>
            </div>
          </main>

          <NurseryHeader />
          <Footer />
        </div>
      </div>

      {/* Bottom Sheet Drawer for Mobile Categories */}
      {categories.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className={classNames(
              "fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] transition-opacity duration-300 ease-in-out lg:hidden",
              isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Bottom Sheet Panel */}
          <div
            className={classNames(
              "fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.2)] z-[1000] flex flex-col transition-transform duration-300 ease-out transform lg:hidden",
              isDrawerOpen ? "translate-y-0" : "translate-y-full"
            )}
            style={{
              backgroundColor: colorBg || "#faf8f5",
            }}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-[#563c39]/20 rounded-full mx-auto my-3 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-[#563c39]/10">
              <h2 className="text-base font-bold text-[#563c39] raleway flex items-center gap-2">
                <FaThLarge size={14} className="text-[#e57f7f]" />
                <span>Danh mục bài viết</span>
              </h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#563c39]/5 text-[#563c39] hover:bg-[#563c39]/10 active:scale-90 transition-all duration-200"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Grid Content */}
            <div className="overflow-y-auto px-6 py-6 hide-scrollbar flex-1 max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3 pb-8">
                {categories.map((cat) => (
                  <Link
                    key={cat.key}
                    href={cat.key === "all" ? "/blog" : `/blog/danh-muc/${encodeURIComponent(cat.key)}`}
                    onClick={() => setIsDrawerOpen(false)}
                    className={classNames(
                      "w-full px-3 py-3.5 rounded-xl text-center text-[12px] font-semibold transition-all duration-300 border flex items-center justify-center min-h-[48px] shadow-sm leading-tight raleway",
                      category === cat.key
                        ? "bg-[#563c39] text-white border-[#563c39] shadow-md shadow-[#563c39]/20"
                        : "bg-white/80 backdrop-blur-md text-gray-700 border-[#799f85]/20 hover:bg-[#fdf6f5]"
                    )}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
