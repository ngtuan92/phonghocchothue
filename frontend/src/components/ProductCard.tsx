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
        <div className="absolute inset-0 bg-gray-950 bg-opacity-70 flex flex-col items-start px-4 py-2 text-white transform translate-y-100 group-hover:translate-y-0 transition-transform duration-500">
          <h3 className="text-lg font-bold">{product.name}</h3>
          <ul className="list-disc ml-5 text-base mt-2 space-y-1">
            {product.equipment && <li>{product.equipment}</li>}
            {product.contains && <li>{product.contains}</li>}
          </ul>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDetailProduct(product)();
            }}
            className="my-4 w-auto bg-[#b8c7b0] px-[15px] sm:px-[20px] text-white rounded-tl-xl rounded-br-xl py-[5px] hover:bg-[#e57f7f]"
          >
            Xem thêm
          </button>
        </div>
      </button>
    );
  }

  const roomHeading = useConfigContentByKey("room-heading");

  return (
    <div className="w-full mx-auto px-6 sm:px-[60px] lg:px-[90px] relative my-8 sm:my-36">
      <RichTextRenderer 
        html={roomHeading} 
        className="text-center mb-6"
        fallback={<h2 className="text-xl sm:text-3xl font-bold mb-6 text-[#563c39]">Không gian phù hợp cho từng quy mô lớp học</h2>}
      />
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
            <div className="h-[266px] sm:h-[300px] mx-auto overflow-hidden group relative">
              <Image
                src={`${URL_API}${product.image.replaceAll("\\", "/")}`}
                alt={product.name || "ảnh"}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                quality={85}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gray-950 bg-opacity-70 flex flex-col items-start px-4 py-2 text-white transform translate-y-100 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-lg font-bold">{product.name}</h3>
                <ul className="list-disc ml-5 text-base mt-2 space-y-1">
                  {product.equipment && <li>{product.equipment}</li>}
                  {product.contains && <li>{product.contains}</li>}
                </ul>
                <button
                  onClick={handleDetailProduct(product)}
                  className="my-4 w-auto bg-[#b8c7b0] px-[15px] sm:px-[20px] text-white rounded-tl-xl rounded-br-xl py-[5px] hover:bg-[#e57f7f]"
                >
                  Xem thêm
                </button>
              </div>
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
