"use client";

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

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function BlogPage() {
  const colorBg = useConfigContentByKey("color-bg");
  const background = useConfigContentByKey("background");
  const logo = useConfigContentByKey("logo");
  const pageStyle = colorBg ? { backgroundColor: colorBg } : {};

  const [categories, setCategories] = useState<{ key: string; label: string }[]>([
    { key: "all", label: "Tất cả" },
  ]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetch(`${URL_API}api/blog/categories?status=1`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          const dynamicTabs = res.data.map((cat: string) => ({
            key: cat,
            label: cat === "kien-thuc" ? "Kiến thức" : cat === "kinh-nghiem" ? "Kinh nghiệm" : cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " "),
          }));

          setCategories([{ key: "all", label: "Tất cả" }, ...dynamicTabs]);
        }
      })
      .catch((err) => console.error("Lỗi tải danh mục:", err));
  }, []);

  useSEO({
    title: "Blog Kiến Thức & Kinh Nghiệm | ChoThuePhongHoc.com",
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

      <div className="relative sm:absolute sm:inset-0 flex items-center justify-center p-2 sm:p-6 md:p-6 lg:p-[40px] xl:p-[50px]">
        <div
          className="w-full min-h-screen sm:min-h-0 sm:h-full rounded-[10px] sm:rounded-[30px] overflow-y-auto hide-scrollbar"
          style={pageStyle}
        >
          <Header />

          <main className="min-h-screen">
            <div className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 overflow-hidden">
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

                  <div className="w-full flex flex-col gap-4">
                    <nav className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-600 raleway">
                      <Link href="/" className="flex items-center gap-1.5 hover:text-[#e57f7f] transition-colors">
                        <FaHome size={15} className="-translate-y-0.5" />
                        <span>Trang chủ</span>
                      </Link>
                      <span className="text-gray-400">/</span>
                      <span className="text-[#563c39] font-medium">Blog</span>
                    </nav>

                    <div className="flex items-end gap-4 mb-2">
                      <h1 className="text-4xl sm:text-7xl font-bold text-[#563c39] raleway tracking-tighter leading-none">
                        Blog<span className="text-[#e57f7f]">.</span>
                      </h1>
                      <div className="hidden sm:block h-px flex-1 bg-gray-100 mb-4" />
                    </div>

                    <p className="max-w-xl text-xs sm:text-sm text-gray-500 leading-relaxed raleway italic">
                      Chia sẻ kiến thức, kinh nghiệm và những câu chuyện xoay quanh việc giảng dạy và không gian học tập chuyên nghiệp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="main-container py-6 sm:py-20">
              <div className="lg:hidden sticky top-0 z-[40] -mx-4 px-4 py-4 bg-transparent mb-8">
                <div className="flex flex-wrap gap-2">
                  {categories.length <= 5 ? (
                    categories.map((cat) => (
                      <Link 
                        key={cat.key}
                        href={cat.key === "all" ? "/blog" : `/blog/danh-muc/${cat.key}`}
                        className={classNames(
                          "whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 border",
                          cat.key === "all" 
                            ? "bg-[#563c39] text-white border-[#563c39] shadow-md shadow-[#563c39]/20" 
                            : "bg-white/80 backdrop-blur-md text-gray-600 border-[#799f85]/20 hover:bg-[#fdf6f5]"
                        )}
                      >
                        {cat.label}
                      </Link>
                    ))
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 w-full">
                        {categories.slice(0, 3).map((cat) => (
                          <Link 
                            key={cat.key}
                            href={cat.key === "all" ? "/blog" : `/blog/danh-muc/${cat.key}`}
                            className={classNames(
                              "whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 border",
                              cat.key === "all" 
                                ? "bg-[#563c39] text-white border-[#563c39] shadow-md shadow-[#563c39]/20" 
                                : "bg-white/80 backdrop-blur-md text-gray-600 border-[#799f85]/20 hover:bg-[#fdf6f5]"
                            )}
                          >
                            {cat.label}
                          </Link>
                        ))}
                        <button 
                          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                          className={classNames(
                            "whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 border bg-white/80 backdrop-blur-md text-[#563c39] border-[#799f85]/20 shadow-sm",
                            isDrawerOpen && "bg-[#563c39] !text-white border-[#563c39]"
                          )}
                        >
                          <FaThLarge size={11} />
                          <span>{isDrawerOpen ? "Thu gọn" : `Thêm (${categories.length - 3})`}</span>
                        </button>
                      </div>

                      {isDrawerOpen && (
                        <div className="w-full mt-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {categories.slice(3).map((cat) => (
                            <Link 
                              key={cat.key}
                              href={cat.key === "all" ? "/blog" : `/blog/danh-muc/${cat.key}`}
                              onClick={() => setIsDrawerOpen(false)}
                              className="px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-md text-[#563c39] border border-[#799f85]/10 text-center text-[13px] font-semibold shadow-sm active:scale-95 transition-all"
                            >
                              {cat.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-16">
                <aside className="hidden lg:block lg:w-[20%]">
                  <CategorySidebar currentCategory="all" showSupport={false} />
                </aside>

                <div className="w-full lg:w-[80%]">
                  <Blog
                    isHomePage={false}
                    currentCategory="all"
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
