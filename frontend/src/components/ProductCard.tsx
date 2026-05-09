"use client";

import React from "react";
import Image from "next/image";
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

interface Product {
  id?: string | number;
  _id?: string | number;
  slug?: string;
  name: string;
  image: string;
  equipment?: string;
  contains?: string;
}

const ProductCard = ({ product }: { product?: Product }) => {
  const router = useRouter();
  const { data: products = [] } = useProducts();

  const handleDetailProduct = (product: Product) => () => {
    router.push(getProductUrl(product));
  };

  if (product) {
    return (
      <button
        type="button"
        className="h-[266px] sm:h-[300px] mx-auto overflow-hidden group relative cursor-pointer w-full p-0 border-0 bg-transparent"
        onClick={handleDetailProduct(product)}
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
      </button>
    );
  }

  const roomHeading = useConfigContentByKey("room-heading");

  return (
    <div className="w-full mx-auto main-container relative my-30 sm:my-36">
      <div className="describe-h2-wrapper">
        <RichTextRenderer
          html={roomHeading}
          className="text-center mb-6"
        />
      </div>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={9}
        slidesPerView={1}
        loop={true}
        navigation={{
          nextEl: ".swiper-button-next-custom",
          prevEl: ".swiper-button-prev-custom",
        }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        breakpoints={{
          320: { slidesPerView: 1, spaceBetween: 10 },
          480: { slidesPerView: 1.2, spaceBetween: 10 },
          640: { slidesPerView: 1.5, spaceBetween: 15 },
          768: { slidesPerView: 2, spaceBetween: 20 },
          1024: { slidesPerView: 4, spaceBetween: 25 },
        }}
        className="w-full h-auto"
      >
        {products.map((product: any) => (
          <SwiperSlide key={product.id || product._id}>
            <div 
              className="h-[266px] sm:h-[300px] mx-auto overflow-hidden group relative cursor-pointer"
              onClick={handleDetailProduct(product)}
            >
              <Image
                src={`${URL_API}${product.image.replaceAll("\\", "/")}`}
                alt={product.name || "ảnh"}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                quality={85}
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="swiper-button-next-custom rounded-[50%]">
        <Image
          className="w-full h-full rounded-[50%]"
          src="/assets/images/next-new.jpg"
          alt="next"
          fill
          sizes="50px"
          quality={75}
          loading="lazy"
        />
      </div>
      <div className="swiper-button-prev-custom rounded-[50%]">
        <Image
          className="w-full h-full rounded-[50%]"
          src="/assets/images/pre-new.jpg"
          alt="pre"
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
