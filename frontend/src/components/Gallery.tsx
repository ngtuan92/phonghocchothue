"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, Grid } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";
import RichTextRenderer from "./RichTextRenderer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/grid";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Gallery: React.FC = () => {
  const galleryHeading = useConfigContentByKey("gallery-heading");
  const { data: sliderData = [] } = useSliders("spaces");

  if (sliderData.length === 0) return null;

  return (
    <section id="gallery" className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fdf8e9] overflow-hidden py-10">
      <div className="container mx-auto px-4 sm:px-[60px] lg:px-[80px] flex flex-col items-center h-full w-full max-w-[1400px]">
        
        <div className="mb-6 sm:mb-10 text-center w-full">
          <RichTextRenderer
            html={galleryHeading}
            className="text-center text-[#563c39]"
            fallback={
              <h2 className="text-center text-4xl sm:text-5xl lg:text-6xl text-[#563c39] font-cursive leading-tight">
                Không gian phòng học qua từng khung hình
              </h2>
            }
          />
        </div>

        <div className="relative group/gallery w-full h-[400px] sm:h-[450px] lg:h-[550px]">
          <Swiper
            modules={[Navigation, Pagination, Autoplay, Grid]}
            grid={{
              rows: 2,
              fill: "row",
            }}
            spaceBetween={20}
            slidesPerView={2}
            slidesPerGroup={2}
            breakpoints={{
              1024: {
                slidesPerView: 3,
                slidesPerGroup: 3,
                grid: { rows: 2, fill: "row" },
              },
            }}
            navigation={{
              nextEl: ".gallery-next",
              prevEl: ".gallery-prev",
            }}
            autoplay={{ delay: 6000, disableOnInteraction: false }}
            loop={false}
            className="w-full h-full gallery-swiper"
          >
            {sliderData.map((item: any, index: number) => (
              <SwiperSlide key={index} className="!h-[calc((100%-20px)/2)]">
                <div className="relative w-full h-full rounded-2xl overflow-hidden group/item shadow-md border-2 border-white/50 transition-all duration-500">
                  <Image
                    src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                    alt={`Ảnh không gian ${index + 1}`}
                    fill
                    className="object-cover group-hover/item:scale-110 transition-transform duration-1000"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    quality={90}
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover/item:bg-transparent transition-colors duration-300"></div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="gallery-prev swiper-button-prev-custom !-left-2 sm:!-left-8 lg:!-left-12 !z-20">
            <Image
              className="w-full h-full rounded-[50%]"
              src="/assets/images/pre-new.jpg"
              alt="pre"
              fill
              sizes="50px"
            />
          </div>
          <div className="gallery-next swiper-button-next-custom !-right-2 sm:!-right-8 lg:!-right-12 !z-20">
            <Image
              className="w-full h-full rounded-[50%]"
              src="/assets/images/next-new.jpg"
              alt="next"
              fill
              sizes="50px"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gallery;
