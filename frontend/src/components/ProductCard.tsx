"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/api/useProducts";
import { getProductUrl } from "@/utils/productUrl";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

const resolveConfigImageUrl = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const normalizedValue = value.trim().replaceAll("\\", "/");
  if (/^https?:\/\//i.test(normalizedValue)) return normalizedValue;
  return `${URL_API.replace(/\/+$/, "")}/${normalizedValue.replace(/^\/+/, "")}`;
};

interface Product {
  id?: string | number;
  _id?: string | number;
  slug?: string;
  name: string;
  name_rich?: string;
  image: string;
  equipment?: string;
  contains?: string;
}

const stripHtml = (val: string) => {
  if (!val) return "";
  return val
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

const ProductCard = ({ product }: { product?: Product }) => {
  const router = useRouter();
  const { data: products = [] } = useProducts();
  const roomHeading = useConfigContentByKey("room-heading");
  const roomSliderPrevImage = useConfigContentByKey("room-slider-prev-image");
  const roomSliderNextImage = useConfigContentByKey("room-slider-next-image");

  const handleDetailProduct = (product: Product) => () => {
    router.push(getProductUrl(product));
  };

  if (product) {
    return (
      <Link
        href={getProductUrl(product)}
        className="h-[266px] sm:h-[300px] mx-auto overflow-hidden group relative block w-full p-0 border-0 bg-transparent text-left"
      >
        <Image
          src={`${URL_API}${product.image.replaceAll("\\", "/")}`}
          alt={product.name}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
          quality={85}
          loading="lazy"
        />

      </Link>
    );
  }

  const shouldAutoSlide = products.length > 1;
  const sliderProducts = shouldAutoSlide && products.length <= 4 ? [...products, ...products] : products;
  const sliderKey = `room-slider-${products.length}-${sliderProducts.length}`;

  return (
    <div className="w-full mx-auto main-container relative mt-[60px] mb-0 sm:mt-36 sm:mb-36">
      <div className="describe-h2-wrapper">
        <RichTextRenderer
          html={roomHeading}
          configKey="room-heading"
          className="text-center mb-4 md:mb-5"
        />
      </div>
      <Swiper
        key={sliderKey}
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={9}
        slidesPerView={1}
        loop={shouldAutoSlide}
        navigation={{
          nextEl: ".swiper-button-next-custom",
          prevEl: ".swiper-button-prev-custom",
        }}
        autoplay={shouldAutoSlide ? {
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        } : false}
        breakpoints={{
          320: { slidesPerView: 1, spaceBetween: 10 },
          480: { slidesPerView: 1.2, spaceBetween: 10 },
          640: { slidesPerView: 1.5, spaceBetween: 15 },
          768: { slidesPerView: 2, spaceBetween: 20 },
          1024: { slidesPerView: 4, spaceBetween: 25 },
        }}
        className="w-full h-auto"
      >
        {sliderProducts.map((product: any, index: number) => (
          <SwiperSlide key={`${product.id || product._id}-${index}`} className="bg-transparent" style={{ backgroundColor: "transparent" }}>
            <Link 
              href={getProductUrl(product)}
              className="h-[266px] sm:h-[300px] mx-auto overflow-hidden group relative block bg-transparent"
              style={{ backgroundColor: "transparent" }}
            >
              <Image
                src={`${URL_API}${product.image.replaceAll("\\", "/")}`}
                alt={product.name || "ảnh phòng"}
                fill
                className="object-contain bg-transparent"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                quality={85}
                loading="lazy"
                style={{ backgroundColor: "transparent" }}
              />

            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="swiper-button-next-custom rounded-[50%]" role="button" aria-label="Hình ảnh kế tiếp">
        <Image
          className="w-full h-full rounded-[50%]"
          src={resolveConfigImageUrl(roomSliderNextImage, "/assets/images/next-new.jpg")}
          alt="Nút chuyển ảnh sau"
          fill
          sizes="50px"
          quality={75}
          loading="lazy"
        />
      </div>
      <div className="swiper-button-prev-custom rounded-[50%]" role="button" aria-label="Hình ảnh trước đó">
        <Image
          className="w-full h-full rounded-[50%]"
          src={resolveConfigImageUrl(roomSliderPrevImage, "/assets/images/pre-new.jpg")}
          alt="Nút chuyển ảnh trước"
          fill
          sizes="50px"
          quality={75}
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default ProductCard;
