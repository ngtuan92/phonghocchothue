"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import classNames from "classnames";
import { FaChevronRight } from "react-icons/fa";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

interface Category {
  key: string;
  label: string;
}

interface CategorySidebarProps {
  currentCategory?: string;
  showSupport?: boolean;
  onCategoryChange?: (category: string) => void;
}

export default function CategorySidebar({ 
  currentCategory = "all", 
  showSupport = false,
  onCategoryChange 
}: CategorySidebarProps) {
  const [categories, setCategories] = useState<Category[]>([
    { key: "all", label: "Tất cả bài viết" },
  ]);

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

  return (
    <div className="lg:sticky lg:top-24 space-y-12">
      <div>
        <h3 className="text-sm font-bold text-[#563c39] uppercase tracking-widest mb-6 flex items-center gap-3">
          <span className="w-8 h-px bg-[#e57f7f]" />
          Danh mục
        </h3>
        <ul className="space-y-4">
          {categories.map((cat) => {
            const isActive = currentCategory === cat.key;

            return (
              <li key={cat.key}>
                <button
                  onClick={() => onCategoryChange?.(cat.key)}
                  className={classNames(
                    "w-full group flex items-center justify-between transition-colors text-left",
                    isActive ? "text-[#e57f7f]" : "text-gray-600 hover:text-[#e57f7f]"
                  )}
                >
                  <span className="text-sm font-medium raleway">{cat.label}</span>
                  <FaChevronRight
                    size={10}
                    className={classNames(
                      "transition-all",
                      isActive
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {showSupport ? (
        <div className="bg-[#fdf6f5] p-8 rounded-2xl border border-[#799f85]/10">
          <h4 className="text-lg font-bold text-[#563c39] mb-3">Bạn cần hỗ trợ?</h4>
          <p className="text-xs text-gray-500 leading-relaxed mb-6 raleway">
            Đừng ngần ngại liên hệ với chúng tôi để được tư vấn không gian phù hợp nhất.
          </p>
          <Link
            href="/#contact"
            className="inline-block w-full text-center py-3 bg-[#563c39] hover:bg-[#e57f7f] text-white text-xs font-bold rounded-tl-xl rounded-br-xl transition-all duration-300"
          >
            Liên hệ ngay
          </Link>
        </div>
      ) : (
        <div className="bg-[#fdf6f5] p-8 rounded-2xl border border-[#799f85]/10">
          <h4 className="text-lg font-bold text-[#563c39] mb-3">Về Blog</h4>
          <p className="text-xs text-gray-700 leading-relaxed raleway mb-6">
            Nơi chia sẻ những bí quyết tối ưu không gian học tập và làm việc hiệu quả nhất.
          </p>
          <Link
            href="/#contact"
            className="inline-block w-full text-center py-3 bg-[#563c39] hover:bg-[#e57f7f] text-white text-xs font-bold rounded-tl-xl rounded-br-xl transition-all duration-300 shadow-sm"
          >
            Liên hệ ngay
          </Link>
        </div>
      )}
    </div>
  );
}
