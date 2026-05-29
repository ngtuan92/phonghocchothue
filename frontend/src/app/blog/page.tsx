"use client";

export const runtime = 'edge'
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NurseryHeader from "@/components/NurseryHeader";
import Blog from "@/components/Blog";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import useSEO from "@/hooks/useSEO";
import Image from "next/image";
import Link from "next/link";
import CategorySidebar from "@/components/CategorySidebar";
import { FaHome, FaThLarge, FaTimes } from "react-icons/fa";
import classNames from "classnames";
import RichTextRenderer from "@/components/RichTextRenderer";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function BlogPage() {
  const colorBg = useConfigContentByKey("color-bg");
  const background = useConfigContentByKey("background");
  const logo = useConfigContentByKey("logo");
  const blogPageTitle = useConfigContentByKey("blog-page-title");
  const blogPageDescription = useConfigContentByKey("blog-page-description");
  const pageStyle = colorBg ? { backgroundColor: colorBg } : {};

  const [categories, setCategories] = useState<{ key: string; label: string }[]>([
    { key: "all", label: "Tất cả" },
  ]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetch(`${URL_API}api/blog/categories?status=1`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          const dynamicTabs = res.data.map((cat: string) => ({
            key: cat,
            label: cat === "kien-thuc" ? "Kiến thức" : cat === "kinh-nghiem" ? "Kinh nghiệm" : decodeURIComponent(cat),
          }));

          setCategories([{ key: "all", label: "Tất cả" }, ...dynamicTabs]);
        }
      })
      .catch((err) => console.error("Lỗi tải danh mục:", err));
  }, []);

  const displayCategory = activeCategory === "all"
    ? "Blog"
    : (categories.find(c => c.key === activeCategory)?.label || decodeURIComponent(activeCategory));

  useSEO({
    title: `${displayCategory === "Blog" ? "Blog Kiến Thức & Kinh Nghiệm" : displayCategory} | ChoThuePhongHoc.com`,
    description: "Tổng hợp kiến thức, kinh nghiệm và mẹo hay khi thuê phòng dạy học, phòng họp tại Đà Nẵng. Cập nhật những xu hướng giáo dục mới nhất.",
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
          className="w-full h-full rounded-[15px] sm:rounded-[30px] overflow-y-auto hide-scrollbar"
          style={pageStyle}
        >
          <Header />

          <main className="min-h-screen">
            <div className="relative pt-12 pb-8 sm:pt-20 sm:pb-16 overflow-hidden">
              <div className="main-container relative z-10">
                <div className="flex flex-col items-center">
                  {logo && (
                    <div className="mb-6 flex justify-center w-full">
                      <Link href="/" className="transition-transform active:scale-95 duration-300">
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

                  <div className="w-full flex flex-col items-center gap-1 text-center">
                    <nav className="hidden sm:flex self-start items-center gap-2 text-xs sm:text-sm text-gray-600 raleway">
                      <Link href="/" className="flex items-center gap-1.5 hover:text-[#e57f7f] transition-colors">
                        <FaHome size={15} className="-translate-y-0.5" />
                        <span>Trang chủ</span>
                      </Link>
                      <span className="text-gray-400">/</span>
                      <button
                        onClick={() => setActiveCategory("all")}
                        className="text-[#563c39] font-medium hover:text-[#e57f7f] transition-colors"
                      >
                        Blog
                      </button>
                    </nav>

                    <div className="flex flex-col items-center mb-0 blog-header-dynamic">
                      <div className="w-full text-center">
                        <RichTextRenderer html={blogPageTitle} />
                      </div>
                    </div>

                    <div className="w-full text-center blog-header-dynamic">
                      <RichTextRenderer html={blogPageDescription} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="main-container pt-0 pb-4 sm:pt-0 sm:pb-8">
              {/* Mobile View: Scrollable Tags with Right Fade Gradient */}
              <div className="lg:hidden sticky top-0 z-[40] -mx-4 px-4 py-2 bg-transparent mb-2">
                <div className="relative w-full">
                  <div className="flex overflow-x-auto gap-2 pb-1.5 hide-scrollbar whitespace-nowrap scroll-smooth">
                    {categories.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={classNames(
                          "whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-300 border",
                          activeCategory === cat.key
                            ? "bg-[#563c39] text-white border-[#563c39] shadow-md shadow-[#563c39]/20"
                            : "bg-white/80 backdrop-blur-md text-gray-600 border-[#799f85]/20 hover:bg-[#fdf6f5]"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                    {/* Spacer at the end to allow scrolling past the gradient */}
                    <div className="w-8 flex-shrink-0" />
                  </div>
                  {/* Dynamic Fade-out Gradient Overlay on the right */}
                  <div 
                    className="absolute right-0 top-0 bottom-1.5 w-8 pointer-events-none z-10"
                    style={{
                      background: `linear-gradient(to left, ${colorBg || '#faf8f5'} 20%, transparent)`
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-16">
                <aside className="hidden lg:block lg:w-[20%]">
                  <CategorySidebar
                    currentCategory={activeCategory}
                    showSupport={false}
                    onCategoryChange={setActiveCategory}
                  />
                </aside>

                <div className="w-full lg:w-[80%]">
                  <Blog
                    isHomePage={false}
                    currentCategory={activeCategory}
                    noContainer={true}
                    showFeatured={false}
                    hideTabs={true}
                  />
                </div>
              </div>
            </div>
          </main>

          <NurseryHeader />
          <Footer />
        </div>
      </div>
    </div>
  );
}
